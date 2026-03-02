import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Message, ChannelId, MessageId, ReactionGroup } from "@openslaq/shared";
import {
  loadThreadMessages,
  loadOlderReplies,
  sendMessage as coreSendMessage,
  listWorkspaceMembers,
  shareMessageOp,
} from "@openslaq/client-core";
import type { MentionSuggestionItem } from "@/hooks/useMentionAutocomplete";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useFileUpload } from "@/hooks/useFileUpload";
import { api } from "@/lib/api";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageActionSheet } from "@/components/MessageActionSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { ShareMessageModal } from "@/components/ShareMessageModal";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function ThreadScreen() {
  const { workspaceSlug, parentMessageId } = useLocalSearchParams<{
    workspaceSlug: string;
    parentMessageId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions({
    authProvider,
    state,
    dispatch,
    userId: user?.id,
  });

  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [members, setMembers] = useState<MentionSuggestionItem[]>([]);
  const [shareMessage, setShareMessage] = useState<Message | null>(null);

  const parentMessage = parentMessageId
    ? state.messagesById[parentMessageId]
    : undefined;
  const channelId = parentMessage?.channelId;

  const { emitTyping } = useTypingEmitter(channelId);
  const typingUsers = useTypingTracking(channelId, user?.id, members);
  const fileUpload = useFileUpload();

  // Load thread messages on mount
  useEffect(() => {
    if (!workspaceSlug || !parentMessageId || !channelId) return;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void loadThreadMessages(deps, { workspaceSlug, channelId, parentMessageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMessageId, channelId, dispatch, authProvider, workspaceSlug]);

  // Load workspace members for mention autocomplete
  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void listWorkspaceMembers(deps, workspaceSlug).then((result) => {
      if (cancelled) return;
      setMembers(result.map((m) => ({ id: m.id, displayName: m.displayName })));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, authProvider]);

  // Real-time message events — filter to this thread's replies
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
      if (
        message.id === parentMessageId ||
        message.parentMessageId === parentMessageId
      ) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [dispatch, parentMessageId],
  );

  const onMessageDeleted = useCallback(
    (payload: { id: string; channelId: string }) => {
      dispatch({
        type: "messages/delete",
        messageId: payload.id,
        channelId: payload.channelId,
      });
    },
    [dispatch],
  );

  const onReactionUpdated = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; reactions: ReactionGroup[] }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updateReactions",
          messageId: payload.messageId,
          reactions: payload.reactions,
        });
      }
    },
    [channelId, dispatch],
  );

  useSocketEvent("message:new", onMessageNew);
  useSocketEvent("message:updated", onMessageUpdated);
  useSocketEvent("message:deleted", onMessageDeleted);
  useSocketEvent("reaction:updated", onReactionUpdated);

  // Get replies for this thread
  const replyIds = parentMessageId
    ? state.threadReplyIds[parentMessageId] ?? []
    : [];
  const replies = replyIds
    .map((id) => state.messagesById[id])
    .filter((m): m is Message => Boolean(m));

  const isLoading = parentMessageId
    ? state.ui.threadLoading[parentMessageId]
    : false;
  const error = parentMessageId
    ? state.ui.threadError[parentMessageId]
    : null;

  const pagination = parentMessageId
    ? state.threadPagination[parentMessageId]
    : undefined;

  const handlePressSender = useCallback(
    (userId: string) => {
      router.push(`/(app)/${workspaceSlug}/profile/${userId}`);
    },
    [router, workspaceSlug],
  );

  const handleAddAttachment = useCallback(() => {
    Alert.alert("Attach", undefined, [
      { text: "Photo Library", onPress: () => void fileUpload.addFromImagePicker() },
      { text: "Camera", onPress: () => void fileUpload.addFromCamera() },
      { text: "File", onPress: () => void fileUpload.addFromDocumentPicker() },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [fileUpload]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!workspaceSlug || !channelId || !parentMessageId) return;
      let attachmentIds: string[] = [];
      if (fileUpload.hasFiles) {
        attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
      }
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await coreSendMessage(deps, {
        channelId,
        workspaceSlug,
        content,
        attachmentIds,
        parentMessageId,
      });
      fileUpload.reset();
    },
    [authProvider, channelId, dispatch, fileUpload, parentMessageId, state, workspaceSlug],
  );

  const handleLoadOlder = useCallback(() => {
    if (
      !workspaceSlug ||
      !channelId ||
      !parentMessageId ||
      !pagination?.hasOlder ||
      pagination.loadingOlder ||
      !pagination.olderCursor
    )
      return;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void loadOlderReplies(deps, {
      workspaceSlug,
      channelId,
      parentMessageId,
      cursor: pagination.olderCursor,
    });
  }, [
    authProvider,
    channelId,
    dispatch,
    pagination,
    parentMessageId,
    state,
    workspaceSlug,
  ]);

  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessage({ id: message.id, content: message.content });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      await handleEditMessage(messageId, content);
      setEditingMessage(null);
    },
    [handleEditMessage],
  );

  const handleLongPress = useCallback((message: Message) => {
    setActionSheetMessage(message);
  }, []);

  const handleOpenEmojiPicker = useCallback(() => {
    if (actionSheetMessage) {
      setEmojiPickerMessageId(actionSheetMessage.id);
    }
    setShowEmojiPicker(true);
  }, [actionSheetMessage]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (emojiPickerMessageId) {
        handleToggleReaction(emojiPickerMessageId, emoji);
      }
      setShowEmojiPicker(false);
      setEmojiPickerMessageId(null);
    },
    [emojiPickerMessageId, handleToggleReaction],
  );

  const handleShareMessage = useCallback((message: Message) => {
    setShareMessage(message);
  }, []);

  const handleConfirmShare = useCallback(
    async (destinationChannelId: string, destinationName: string, comment: string) => {
      if (!shareMessage || !workspaceSlug) return;
      try {
        const deps = { api, auth: authProvider, dispatch, getState: () => state };
        await shareMessageOp(deps, {
          workspaceSlug,
          destinationChannelId,
          sharedMessageId: shareMessage.id,
          comment,
        });
        Alert.alert("Shared", `Message shared to ${destinationName}`);
      } catch {
        Alert.alert("Error", "Failed to share message");
      }
      setShareMessage(null);
    },
    [authProvider, dispatch, shareMessage, state, workspaceSlug],
  );

  // Build combined list: parent message + replies
  const data = parentMessage ? [parentMessage, ...replies] : replies;

  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom on initial thread load (so user sees newest replies)
  useEffect(() => {
    if (data.length > 1 && !isLoading) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (event.nativeEvent.contentOffset.y < 200) {
        handleLoadOlder();
      }
    },
    [handleLoadOlder],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      keyboardVerticalOffset={90}
    >
      {isLoading && data.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ color: theme.colors.textFaint }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          testID="thread-message-list"
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View>
              <MessageBubble
                message={item}
                currentUserId={user?.id}
                onToggleReaction={handleToggleReaction}
                onLongPress={handleLongPress}
                onPressSender={handlePressSender}
              />
              {index === 0 && replies.length > 0 && (
                <>
                  <View
                    className="mx-4 my-2 border-b"
                    style={{ borderColor: theme.colors.borderDefault }}
                  />
                  {pagination?.loadingOlder && (
                    <View testID="thread-load-more-spinner" className="items-center py-4">
                      <ActivityIndicator size="small" color={theme.brand.primary} />
                    </View>
                  )}
                </>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text style={{ color: theme.colors.textFaint }}>
                No replies yet
              </Text>
            </View>
          }
          contentContainerStyle={
            data.length === 0 ? { flex: 1 } : undefined
          }
          onScroll={handleScroll}
          scrollEventThrottle={200}
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        />
      )}
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        onSend={handleSend}
        placeholder="Reply in thread"
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        members={members}
        onTyping={emitTyping}
        pendingFiles={fileUpload.pendingFiles}
        onAddAttachment={handleAddAttachment}
        onRemoveFile={fileUpload.removeFile}
        uploading={fileUpload.uploading}
      />
      <MessageActionSheet
        visible={actionSheetMessage != null}
        message={actionSheetMessage}
        currentUserId={user?.id}
        onReaction={handleToggleReaction}
        onOpenEmojiPicker={handleOpenEmojiPicker}
        onEditMessage={handleStartEdit}
        onDeleteMessage={handleDeleteMessage}
        onShareMessage={handleShareMessage}
        onClose={() => setActionSheetMessage(null)}
      />
      <EmojiPickerSheet
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => {
          setShowEmojiPicker(false);
          setEmojiPickerMessageId(null);
        }}
      />
      <ShareMessageModal
        visible={shareMessage != null}
        message={shareMessage}
        channels={state.channels.filter((c) => !c.isArchived)}
        dms={state.dms}
        groupDms={state.groupDms}
        onShare={handleConfirmShare}
        onClose={() => setShareMessage(null)}
      />
    </KeyboardAvoidingView>
  );
}
