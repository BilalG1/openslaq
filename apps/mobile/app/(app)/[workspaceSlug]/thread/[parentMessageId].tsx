import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  Platform,
  Alert,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import type { Message, ChannelId, MessageId, UserId, ReactionGroup, MobileTheme } from "@openslaq/shared";
import { asChannelId, asUserId, asMessageId } from "@openslaq/shared";
import {
  loadThreadMessages,
  loadOlderReplies,
  sendMessage as coreSendMessage,
  listWorkspaceMembers,
  shareMessageOp,
  markChannelAsUnread,
} from "@openslaq/client-core";
import type { MentionSuggestionItem } from "@/components/MentionSuggestionList";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useMessageScrollTarget } from "@/hooks/useMessageScrollTarget";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useFileUpload, type PendingFile } from "@/hooks/useFileUpload";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInputSwitcher as MessageInput } from "@/components/MessageInputSwitcher";
import { TypingIndicator, typingIndicatorWrapperStyle } from "@/components/TypingIndicator";
import { MessageActionSheet } from "@/components/MessageActionSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { ShareMessageModal } from "@/components/ShareMessageModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useThreadParams } from "@/hooks/useRouteParams";
import { routes } from "@/lib/routes";

export default function ThreadScreen() {
  const { workspaceSlug, parentMessageId } = useThreadParams();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUserId = user?.id ? asUserId(user.id) : undefined;
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions(currentUserId);
  const styles = makeStyles(theme);

  const [editingMessage, setEditingMessage] = useState<{ id: MessageId; content: string } | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [members, setMembers] = useState<MentionSuggestionItem[]>([]);
  const [shareMessage, setShareMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTarget = state.scrollTarget;

  const parentMessage = parentMessageId ? state.messagesById[parentMessageId] : undefined;
  const channelId =
    parentMessage?.channelId ??
    (scrollTarget != null && scrollTarget.parentMessageId === parentMessageId ? asChannelId(scrollTarget.channelId) : undefined);
  const customEmojis = state.customEmojis;

  const { emitTyping } = useTypingEmitter(channelId);
  const typingUsers = useTypingTracking(channelId, currentUserId, members as { id: UserId; displayName: string }[]);
  const fileUpload = useFileUpload();

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!workspaceSlug || !parentMessageId || !channelId) return;
    let cancelled = false;
    void loadThreadMessages(deps, { workspaceSlug, channelId, parentMessageId }).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [parentMessageId, channelId, dispatch, authProvider, workspaceSlug]);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    void listWorkspaceMembers(deps, workspaceSlug).then((result) => {
      if (cancelled) return;
      setMembers(result.map((m) => ({ id: m.id, displayName: m.displayName })));
    });
    return () => { cancelled = true; };
     
  }, [workspaceSlug, authProvider]);

  const onMessageNew = useCallback(
    (message: Message) => {
      if (message.parentMessageId === parentMessageId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [dispatch, parentMessageId],
  );

  const onMessageUpdated = useCallback(
    (message: Message) => {
      if (message.id === parentMessageId || message.parentMessageId === parentMessageId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [dispatch, parentMessageId],
  );

  const onMessageDeleted = useCallback(
    (payload: { id: MessageId; channelId: ChannelId }) => {
      dispatch({ type: "messages/delete", messageId: payload.id, channelId: payload.channelId });
    },
    [dispatch],
  );

  const onReactionUpdated = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; reactions: ReactionGroup[] }) => {
      if (payload.channelId === channelId) {
        dispatch({ type: "messages/updateReactions", messageId: payload.messageId, reactions: payload.reactions });
      }
    },
    [channelId, dispatch],
  );

  useSocketEvent("message:new", onMessageNew);
  useSocketEvent("message:updated", onMessageUpdated);
  useSocketEvent("message:deleted", onMessageDeleted);
  useSocketEvent("reaction:updated", onReactionUpdated);

  const replyIds = parentMessageId ? state.threadReplyIds[parentMessageId] ?? [] : [];
  const replies = replyIds.map((id) => state.messagesById[id]).filter((m): m is Message => Boolean(m));
  const isLoading = parentMessageId ? state.ui.threadLoading[parentMessageId] : false;
  const error = parentMessageId ? state.ui.threadError[parentMessageId] : null;
  const pagination = parentMessageId ? state.threadPagination[parentMessageId] : undefined;

  const handlePressSender = useCallback((userId: string) => { router.push(routes.profile(workspaceSlug!, userId)); }, [router, workspaceSlug]);

  const handleSendVoiceMessage = useCallback(async (uri: string, _durationMs: number) => {
    if (!workspaceSlug || !channelId || !parentMessageId) return;
    const file: PendingFile = { id: `voice-${Date.now()}`, uri, name: `voice-message-${Date.now()}.m4a`, mimeType: "audio/mp4", isImage: false };
    fileUpload.addFile(file);
    const attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
    await coreSendMessage(deps, { channelId, workspaceSlug, content: "", attachmentIds, parentMessageId, userId: user?.id, senderDisplayName: user?.displayName ?? "", senderAvatarUrl: user?.avatarUrl ?? null });
    fileUpload.reset();
  }, [authProvider, channelId, dispatch, fileUpload, parentMessageId, user, workspaceSlug]);

  const handleAddAttachment = useCallback(() => {
    Alert.alert("Attach", undefined, [
      { text: "Photo Library", onPress: () => void fileUpload.addFromImagePicker() },
      { text: "Camera", onPress: () => void fileUpload.addFromCamera() },
      { text: "File", onPress: () => void fileUpload.addFromDocumentPicker() },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [fileUpload]);

  const handleSend = useCallback(async (content: string): Promise<boolean> => {
    if (!workspaceSlug || !channelId || !parentMessageId) return false;
    let attachmentIds: string[] = [];
    if (fileUpload.hasFiles) { attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken()); }
    const ok = await coreSendMessage(deps, { channelId, workspaceSlug, content, attachmentIds, parentMessageId, userId: user?.id, senderDisplayName: user?.displayName ?? "", senderAvatarUrl: user?.avatarUrl ?? null });
    if (ok) fileUpload.reset();
    return ok;
  }, [authProvider, channelId, dispatch, fileUpload, parentMessageId, user, workspaceSlug]);

  const handleLoadOlder = useCallback(() => {
    if (!workspaceSlug || !channelId || !parentMessageId || !pagination?.hasOlder || pagination.loadingOlder || !pagination.olderCursor) return;
    void loadOlderReplies(deps, { workspaceSlug, channelId, parentMessageId, cursor: pagination.olderCursor });
  }, [authProvider, channelId, dispatch, pagination, parentMessageId, workspaceSlug]);

  const handleStartEdit = useCallback((message: Message) => { setEditingMessage({ id: message.id, content: message.content }); }, []);
  const handleCancelEdit = useCallback(() => { setEditingMessage(null); }, []);
  const handleSaveEdit = useCallback(async (messageId: string, content: string) => { await handleEditMessage(asMessageId(messageId), content); setEditingMessage(null); }, [handleEditMessage]);
  const handleLongPress = useCallback((message: Message) => { setActionSheetMessage(message); }, []);
  const handleOpenEmojiPicker = useCallback(() => { if (actionSheetMessage) { setEmojiPickerMessageId(actionSheetMessage.id); } setShowEmojiPicker(true); }, [actionSheetMessage]);
  const handleEmojiSelect = useCallback((emoji: string) => { if (emojiPickerMessageId) { handleToggleReaction(asMessageId(emojiPickerMessageId), emoji); } setShowEmojiPicker(false); setEmojiPickerMessageId(null); }, [emojiPickerMessageId, handleToggleReaction]);
  const handleMarkAsUnread = useCallback(async (messageId: string) => { if (!workspaceSlug || !channelId) return; await markChannelAsUnread(deps, { workspaceSlug, channelId, messageId }); }, [authProvider, channelId, dispatch, workspaceSlug]);
  const handleShareMessage = useCallback((message: Message) => { setShareMessage(message); }, []);
  const handleConfirmShare = useCallback(async (destinationChannelId: string, destinationName: string, comment: string) => {
    if (!shareMessage || !workspaceSlug) return;
    try { await shareMessageOp(deps, { workspaceSlug, destinationChannelId, sharedMessageId: shareMessage.id, comment }); Alert.alert("Shared", `Message shared to ${destinationName}`); } catch { Alert.alert("Error", "Failed to share message"); }
    setShareMessage(null);
  }, [authProvider, dispatch, shareMessage, workspaceSlug]);

  const data = parentMessage ? [parentMessage, ...replies] : replies;
  const flatListRef = useRef<FlatList<Message>>(null);

  const highlightMessage = useCallback((messageId: string) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedMessageId(messageId);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
      highlightTimeoutRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    if (
      data.length > 1 &&
      !isLoading &&
      !(scrollTarget?.parentMessageId === parentMessageId)
    ) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
     
  }, [data.length, isLoading, parentMessageId, scrollTarget?.parentMessageId]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => { if (event.nativeEvent.contentOffset.y < 200) { handleLoadOlder(); } }, [handleLoadOlder]);

  const activeScrollTarget =
    scrollTarget != null && scrollTarget.parentMessageId === parentMessageId
      ? scrollTarget
      : null;

  useMessageScrollTarget({
    scrollTarget: activeScrollTarget,
    messages: data,
    listRef: flatListRef,
    isInitialLoading: Boolean(isLoading && data.length === 0),
    canLoadOlder: pagination?.hasOlder ?? false,
    loadingOlder: pagination?.loadingOlder ?? false,
    onLoadOlder: handleLoadOlder,
    onResolve: (messageId) => {
      highlightMessage(messageId);
      dispatch({ type: "navigation/clearScrollTarget" });
    },
    onExhausted: () => {
      dispatch({ type: "navigation/clearScrollTarget" });
    },
  });

  if (!parentMessage) {
    return (<View style={styles.center}><ActivityIndicator size="large" color={theme.brand.primary} /></View>);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flexSurface} keyboardVerticalOffset={insets.top + 56}>
      {isLoading && data.length === 0 ? (
        <View style={styles.centerFlex}><ActivityIndicator size="large" color={theme.brand.primary} /></View>
      ) : error ? (
        <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          ref={flatListRef}
          testID="thread-message-list"
          data={data}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index,
                animated: false,
                viewPosition: 0.5,
              });
            }, 50);
          }}
          renderItem={({ item, index }) => {
            const prev = index > 0 ? data[index - 1] : undefined;
            const isGrouped = index > 0 && prev != null && prev.userId === item.userId && new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000 && new Date(item.createdAt).toDateString() === new Date(prev.createdAt).toDateString();
            return (
              <View>
                <MessageBubble message={item} isGrouped={isGrouped} currentUserId={currentUserId} onToggleReaction={handleToggleReaction} onLongPress={handleLongPress} onPressSender={handlePressSender} onPressMention={handlePressSender} customEmojis={customEmojis} highlighted={item.id === highlightedMessageId} />
                {index === 0 && replies.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    {pagination?.loadingOlder && (<View testID="thread-load-more-spinner" style={styles.loadMoreSpinner}><ActivityIndicator size="small" color={theme.brand.primary} /></View>)}
                  </>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No replies yet</Text></View>}
          contentContainerStyle={data.length === 0 ? staticStyles.flexOne : undefined}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        />
      )}
      <View style={typingIndicatorWrapperStyle}>
        <TypingIndicator typingUsers={typingUsers} />
        <MessageInput onSend={handleSend} placeholder="Reply in thread" draftKey={parentMessageId ? `thread-${parentMessageId}` : undefined} editingMessage={editingMessage} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit} members={members} onTyping={emitTyping} pendingFiles={fileUpload.pendingFiles} onAddAttachment={handleAddAttachment} onRemoveFile={fileUpload.removeFile} uploading={fileUpload.uploading} onSendVoiceMessage={handleSendVoiceMessage} autoFocus />
      </View>
      <View style={{ height: insets.bottom }} />
      {actionSheetMessage && (
        <MessageActionSheet visible message={actionSheetMessage} currentUserId={currentUserId} onReaction={handleToggleReaction} onOpenEmojiPicker={handleOpenEmojiPicker} onEditMessage={handleStartEdit} onDeleteMessage={handleDeleteMessage} onMarkAsUnread={handleMarkAsUnread} onShareMessage={handleShareMessage} onClose={() => setActionSheetMessage(null)} />
      )}
      {showEmojiPicker && (
        <EmojiPickerSheet visible onSelect={handleEmojiSelect} onClose={() => { setShowEmojiPicker(false); setEmojiPickerMessageId(null); }} customEmojis={customEmojis} />
      )}
      {shareMessage && (
        <ShareMessageModal visible message={shareMessage} channels={state.channels.filter((c) => !c.isArchived)} dms={state.dms} groupDms={state.groupDms} onShare={handleConfirmShare} onClose={() => setShareMessage(null)} />
      )}
    </KeyboardAvoidingView>
  );
}

const staticStyles = StyleSheet.create({ flexOne: { flex: 1 } });

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
    flexSurface: { flex: 1, backgroundColor: theme.colors.surface },
    centerFlex: { flex: 1, alignItems: "center", justifyContent: "center" },
    errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    errorText: { color: theme.colors.textFaint },
    divider: { marginHorizontal: 16, marginVertical: 8, borderBottomWidth: 1, borderColor: theme.colors.borderDefault },
    loadMoreSpinner: { alignItems: "center", paddingVertical: 16 },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
    emptyText: { color: theme.colors.textFaint },
  });
