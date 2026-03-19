import { useCallback, useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { Message, ChannelId, MobileTheme } from "@openslaq/shared";
import {
  loadChannelMessages,
  loadOlderMessages,
  sendMessage as coreSendMessage,
  listWorkspaceMembers,
  saveMessageOp,
  unsaveMessageOp,
  shareMessageOp,
  createScheduledMessageOp,
  markChannelAsUnread,
  createDm,
} from "@openslaq/client-core";
import * as Clipboard from "expo-clipboard";
import type { MentionSuggestionItem } from "@/components/MentionSuggestionList";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useChannelSocketEvents } from "@/hooks/useChannelSocketEvents";
import { useFileUpload, type PendingFile } from "@/hooks/useFileUpload";
import { ChannelMessageList } from "@/components/ChannelMessageList";
import { MessageInput } from "@/components/MessageInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageActionSheet } from "@/components/MessageActionSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { ShareMessageModal } from "@/components/ShareMessageModal";
import { HuddleHeaderButton } from "@/components/huddle/HuddleHeaderButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { ChevronLeft } from "lucide-react-native";
import { routes } from "@/lib/routes";
import {
  ChannelModalsProvider,
  useChannelModalsState,
  useChannelModalsDispatch,
} from "@/contexts/ChannelModalsContext";

export default function DmScreen() {
  return (
    <ChannelModalsProvider>
      <DmScreenInner />
    </ChannelModalsProvider>
  );
}

function DmScreenInner() {
  const { workspaceSlug: urlSlug, channelId: dmChannelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const workspaceSlug = state.workspaceSlug ?? urlSlug;
  const { joinChannel, leaveChannel } = useChannelSocketEvents(dmChannelId);
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions(user?.id);
  const styles = makeStyles(theme);

  const modalsState = useChannelModalsState();
  const modalsDispatch = useChannelModalsDispatch();

  const [members, setMembers] = useState<MentionSuggestionItem[]>([]);

  const { emitTyping } = useTypingEmitter(dmChannelId);
  const typingUsers = useTypingTracking(dmChannelId, user?.id, members);
  const fileUpload = useFileUpload();

  const customEmojis = state.customEmojis;
  const scrollTarget = state.scrollTarget;
  const dm = state.dms.find((d) => d.channel.id === dmChannelId);
  const groupDm = state.groupDms.find((g) => g.channel.id === dmChannelId);
  const displayName = dm
    ? (dm.otherUser.displayName ?? "DM")
    : groupDm
      ? (groupDm.channel.displayName ?? groupDm.members.map((m) => m.displayName).join(", "))
      : "DM";



  // Set header title, huddle button, and options button
  useEffect(() => {
    const channelId = dm?.channel.id ?? groupDm?.channel.id;
    if (!channelId) return;
    navigation.setOptions({
      title: displayName,
      headerLeft: () => (
        <Pressable testID="dm-back-button" onPress={() => router.back()} hitSlop={8} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back" accessibilityHint="Navigates to the previous screen">
          <ChevronLeft size={28} color={theme.brand.primary} />
        </Pressable>
      ),
      ...(groupDm
        ? {
            headerTitle: () => (
              <View style={styles.groupDmHeader}>
                <Text style={styles.groupDmTitle} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.groupDmSubtitle}>
                  {groupDm.members.length} members
                </Text>
              </View>
            ),
          }
        : {}),
      headerRight: () => (
        <HuddleHeaderButton channelId={channelId} />
      ),
    });
  }, [dm, groupDm, displayName, navigation, router, theme.brand.primary, theme.colors.textPrimary, theme.colors.textFaint]);

  // Select DM + load messages (consolidated)
  useEffect(() => {
    if (!dmChannelId) return;
    if (groupDm) {
      dispatch({ type: "workspace/selectGroupDm", channelId: dmChannelId });
    } else {
      dispatch({ type: "workspace/selectDm", channelId: dmChannelId });
    }
    if (!workspaceSlug) return;
    let cancelled = false;
    void loadChannelMessages(deps, {
      workspaceSlug,
      channelId: dmChannelId,
    }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [dmChannelId, dispatch, authProvider, workspaceSlug, groupDm]);

  // Load workspace members for mention autocomplete
  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    void listWorkspaceMembers(deps, workspaceSlug).then((result) => {
      if (cancelled) return;
      setMembers(result.map((m) => ({ id: m.id, displayName: m.displayName })));
    });
    return () => { cancelled = true; };
  }, [workspaceSlug, authProvider]);

  // Join/leave socket room
  useEffect(() => {
    if (!dmChannelId) return;
    joinChannel(dmChannelId as Parameters<typeof joinChannel>[0]);
    return () => {
      leaveChannel(dmChannelId as Parameters<typeof leaveChannel>[0]);
    };
  }, [dmChannelId, joinChannel, leaveChannel]);

  // Get messages
  const messageIds = dmChannelId
    ? state.channelMessageIds[dmChannelId] ?? []
    : [];
  const messages = messageIds
    .map((id) => state.messagesById[id])
    .filter((m): m is Message => Boolean(m));

  const isLoading = dmChannelId
    ? state.ui.channelMessagesLoading[dmChannelId]
    : false;

  const pagination = dmChannelId ? state.channelPagination[dmChannelId] : undefined;

  const handleLoadOlder = useCallback(() => {
    if (!pagination?.hasOlder || pagination.loadingOlder || !pagination.olderCursor) return;
    if (!workspaceSlug || !dmChannelId) return;
    void loadOlderMessages(deps, { workspaceSlug, channelId: dmChannelId, cursor: pagination.olderCursor });
  }, [authProvider, dmChannelId, dispatch, pagination, state, workspaceSlug]);

  const handlePressThread = useCallback(
    (messageId: string) => {
      router.push(routes.thread(workspaceSlug, messageId));
    },
    [router, workspaceSlug],
  );

  const handlePressSender = useCallback(
    (userId: string) => {
      router.push(routes.profile(workspaceSlug, userId));
    },
    [router, workspaceSlug],
  );

  const handleSendVoiceMessage = useCallback(
    async (uri: string, _durationMs: number) => {
      if (!workspaceSlug || !dmChannelId) return;
      const file: PendingFile = {
        id: `voice-${Date.now()}`,
        uri,
        name: `voice-message-${Date.now()}.m4a`,
        mimeType: "audio/mp4",
        isImage: false,
      };
      fileUpload.addFile(file);
      const attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
      await coreSendMessage(deps, { channelId: dmChannelId, workspaceSlug, content: "", attachmentIds });
      fileUpload.reset();
    },
    [authProvider, dmChannelId, dispatch, fileUpload, state, workspaceSlug],
  );

  const handleAddAttachment = useCallback(() => {
    Alert.alert("Attach", undefined, [
      { text: "Photo Library", onPress: () => void fileUpload.addFromImagePicker() },
      { text: "Camera", onPress: () => void fileUpload.addFromCamera() },
      { text: "File", onPress: () => void fileUpload.addFromDocumentPicker() },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [fileUpload]);

  // Ensure the DM channel exists in the database
  useEffect(() => {
    if (!workspaceSlug || !dm?.otherUser?.id) return;
    void createDm(deps, { workspaceSlug, targetUserId: dm.otherUser.id });
  }, [workspaceSlug, dm?.otherUser?.id]);

  const handleSend = useCallback(
    async (content: string): Promise<boolean> => {
      if (!workspaceSlug || !dmChannelId) return false;
      let attachmentIds: string[] = [];
      if (fileUpload.hasFiles) {
        attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
      }
      const ok = await coreSendMessage(deps, {
        channelId: dmChannelId,
        workspaceSlug,
        content,
        attachmentIds,
      });
      if (!ok) {
        Alert.alert("Error", "Failed to send message. Please try again.");
        return false;
      }
      fileUpload.reset();
      return true;
    },
    [authProvider, dmChannelId, dispatch, fileUpload, state, workspaceSlug],
  );

  const handleStartEdit = useCallback((message: Message) => {
    modalsDispatch({ type: "setEditingMessage", message: { id: message.id, content: message.content } });
  }, [modalsDispatch]);

  const handleCancelEdit = useCallback(() => {
    modalsDispatch({ type: "setEditingMessage", message: null });
  }, [modalsDispatch]);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      await handleEditMessage(messageId, content);
      modalsDispatch({ type: "setEditingMessage", message: null });
    },
    [handleEditMessage, modalsDispatch],
  );

  const handleLongPress = useCallback((message: Message) => {
    modalsDispatch({ type: "showActionSheet", message });
  }, [modalsDispatch]);

  const handleOpenEmojiPicker = useCallback(() => {
    modalsDispatch({
      type: "showEmojiPicker",
      messageId: modalsState.actionSheetMessage?.id ?? null,
    });
  }, [modalsDispatch, modalsState.actionSheetMessage]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (modalsState.emojiPickerMessageId) {
        handleToggleReaction(modalsState.emojiPickerMessageId, emoji);
      }
      modalsDispatch({ type: "closeEmojiPicker" });
    },
    [modalsState.emojiPickerMessageId, handleToggleReaction, modalsDispatch],
  );

  const handleSaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !dmChannelId) return;
      await saveMessageOp(deps, { workspaceSlug, channelId: dmChannelId, messageId });
    },
    [authProvider, dmChannelId, dispatch, state, workspaceSlug],
  );

  const handleUnsaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !dmChannelId) return;
      await unsaveMessageOp(deps, { workspaceSlug, channelId: dmChannelId, messageId });
    },
    [authProvider, dmChannelId, dispatch, state, workspaceSlug],
  );

  const handleCopyText = useCallback(
    (message: Message) => {
      void Clipboard.setStringAsync(message.content);
      Alert.alert("Copied", "Message text copied to clipboard");
    },
    [],
  );

  const handleCopyLink = useCallback(
    (message: Message) => {
      const link = `openslaq://${workspaceSlug}/c/${dmChannelId}/p/${message.id}`;
      void Clipboard.setStringAsync(link);
      Alert.alert("Copied", "Message link copied to clipboard");
    },
    [workspaceSlug, dmChannelId],
  );

  const handleMarkAsUnread = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !dmChannelId) return;
      await markChannelAsUnread(deps, { workspaceSlug, channelId: dmChannelId, messageId });
    },
    [authProvider, dmChannelId, dispatch, state, workspaceSlug],
  );

  const handleShareMessage = useCallback((message: Message) => {
    modalsDispatch({ type: "showShareMessage", message });
  }, [modalsDispatch]);

  const handleScheduleSend = useCallback(
    async (content: string, scheduledFor: Date) => {
      if (!workspaceSlug || !dmChannelId) return;
      try {
          let attachmentIds: string[] = [];
        if (fileUpload.hasFiles) {
          attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
        }
        await createScheduledMessageOp(deps, {
          workspaceSlug,
          channelId: dmChannelId,
          content,
          scheduledFor: scheduledFor.toISOString(),
          attachmentIds,
        });
        fileUpload.reset();
        Alert.alert("Scheduled", "Your message has been scheduled.");
      } catch {
        Alert.alert("Error", "Failed to schedule message.");
      }
    },
    [authProvider, dmChannelId, dispatch, fileUpload, state, workspaceSlug],
  );

  const handleConfirmShare = useCallback(
    async (destinationChannelId: string, destinationName: string, comment: string) => {
      if (!modalsState.shareMessage || !workspaceSlug) return;
      try {
          await shareMessageOp(deps, {
          workspaceSlug,
          destinationChannelId,
          sharedMessageId: modalsState.shareMessage.id,
          comment,
        });
        Alert.alert("Shared", `Message shared to ${destinationName}`);
      } catch {
        Alert.alert("Error", "Failed to share message");
      }
      modalsDispatch({ type: "closeShareMessage" });
    },
    [authProvider, dispatch, modalsDispatch, modalsState.shareMessage, state, workspaceSlug],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.flexSurface}
      keyboardVerticalOffset={insets.top + 56}
    >
      {isLoading && messages.length === 0 ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <ChannelMessageList
          channelId={dmChannelId}
          messages={messages}
          customEmojis={customEmojis}
          currentUserId={user?.id}
          ephemeralMessages={modalsState.ephemeralMessages}
          scrollTarget={scrollTarget}
          isLoading={isLoading ?? false}
          pagination={pagination}
          onPressThread={handlePressThread}
          onPressSender={handlePressSender}
          onToggleReaction={handleToggleReaction}
          onLongPress={handleLongPress}
          onLoadOlder={handleLoadOlder}
        />
      )}
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        onSend={handleSend}
        placeholder={`Message ${displayName}`}
        draftKey={dmChannelId}
        editingMessage={modalsState.editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        members={members}
        onTyping={emitTyping}
        pendingFiles={fileUpload.pendingFiles}
        onAddAttachment={handleAddAttachment}
        onRemoveFile={fileUpload.removeFile}
        uploading={fileUpload.uploading}
        onScheduleSend={handleScheduleSend}
        onSendVoiceMessage={handleSendVoiceMessage}
      />
      {modalsState.actionSheetMessage && (
        <MessageActionSheet
          visible
          message={modalsState.actionSheetMessage}
          currentUserId={user?.id}
          isSaved={state.savedMessageIds.includes(modalsState.actionSheetMessage.id)}
          onReaction={handleToggleReaction}
          onOpenEmojiPicker={handleOpenEmojiPicker}
          onEditMessage={handleStartEdit}
          onDeleteMessage={handleDeleteMessage}
          onSaveMessage={handleSaveMessage}
          onUnsaveMessage={handleUnsaveMessage}
          onCopyText={handleCopyText}
          onCopyLink={handleCopyLink}
          onMarkAsUnread={handleMarkAsUnread}
          onShareMessage={handleShareMessage}
          onReplyInThread={handlePressThread}
          onClose={() => modalsDispatch({ type: "closeActionSheet" })}
        />
      )}
      {modalsState.showEmojiPicker && (
        <EmojiPickerSheet
          visible
          onSelect={handleEmojiSelect}
          onClose={() => modalsDispatch({ type: "closeEmojiPicker" })}
          customEmojis={customEmojis}
        />
      )}
      {modalsState.shareMessage && (
        <ShareMessageModal
          visible
          message={modalsState.shareMessage}
          channels={state.channels.filter((c) => !c.isArchived)}
          dms={state.dms}
          groupDms={state.groupDms}
          onShare={handleConfirmShare}
          onClose={() => modalsDispatch({ type: "closeShareMessage" })}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const staticStyles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    flexSurface: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    centerFlex: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
    },
    emptyText: {
      color: theme.colors.textFaint,
    },
    backButton: {
      marginRight: 4,
    },
    groupDmHeader: {
      alignItems: "center",
    },
    groupDmTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    groupDmSubtitle: {
      fontSize: 12,
      color: theme.colors.textFaint,
    },
  });
