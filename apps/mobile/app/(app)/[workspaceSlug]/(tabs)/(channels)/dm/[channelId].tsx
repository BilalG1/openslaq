import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { Message, ChannelId, MessageId, ReactionGroup } from "@openslaq/shared";
import {
  loadChannelMessages,
  sendMessage as coreSendMessage,
  listWorkspaceMembers,
  setChannelNotificationPrefOp as setChannelNotificationPref,
  saveMessageOp,
  unsaveMessageOp,
  shareMessageOp,
  createScheduledMessageOp,
  markChannelAsUnread,
} from "@openslaq/client-core";
import * as Clipboard from "expo-clipboard";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import type { MentionSuggestionItem } from "@/components/MentionSuggestionList";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useFileUpload, type PendingFile } from "@/hooks/useFileUpload";
import { MessageBubble } from "@/components/MessageBubble";
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

export default function DmScreen() {
  const { workspaceSlug: urlSlug, channelId: dmChannelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const workspaceSlug = state.workspaceSlug ?? urlSlug;
  const { joinChannel, leaveChannel } = useSocket();
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions(user?.id);

  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [members, setMembers] = useState<MentionSuggestionItem[]>([]);
  const [shareMessage, setShareMessage] = useState<Message | null>(null);

  const { emitTyping } = useTypingEmitter(dmChannelId);
  const typingUsers = useTypingTracking(dmChannelId, user?.id, members);
  const fileUpload = useFileUpload();

  const customEmojis = state.customEmojis;
  const dm = state.dms.find((d) => d.channel.id === dmChannelId);
  const groupDm = state.groupDms.find((g) => g.channel.id === dmChannelId);
  const displayName = dm
    ? (dm.otherUser.displayName ?? "DM")
    : groupDm
      ? (groupDm.channel.displayName ?? groupDm.members.map((m) => m.displayName).join(", "))
      : "DM";

  const handleNotificationPref = useCallback(() => {
    if (!dmChannelId || !workspaceSlug) return;
    const currentLevel = state.channelNotificationPrefs[dmChannelId] ?? "all";
    const levels: { label: string; value: ChannelNotifyLevel }[] = [
      { label: "All messages", value: "all" },
      { label: "Mentions only", value: "mentions" },
      { label: "Muted", value: "muted" },
    ];
    Alert.alert(
      "Notifications",
      "Choose notification level for this conversation",
      [
        ...levels.map((l) => ({
          text: l.value === currentLevel ? `${l.label} \u2713` : l.label,
          onPress: () => {
            if (l.value !== currentLevel) {
                void setChannelNotificationPref(deps, {
                slug: workspaceSlug,
                channelId: dmChannelId,
                level: l.value,
              });
            }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [authProvider, dmChannelId, dispatch, state, workspaceSlug]);

  const handleShowOptions = useCallback(() => {
    Alert.alert("Options", undefined, [
      { text: "Notifications", onPress: handleNotificationPref },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleNotificationPref]);

  // Set header title, huddle button, and options button
  useEffect(() => {
    const channelId = dm?.channel.id ?? groupDm?.channel.id;
    if (!channelId) return;
    navigation.setOptions({
      title: displayName,
      headerLeft: () => (
        <Pressable testID="dm-back-button" onPress={() => router.back()} hitSlop={8} style={{ marginRight: 4 }}>
          <ChevronLeft size={28} color={theme.brand.primary} />
        </Pressable>
      ),
      ...(groupDm
        ? {
            headerTitle: () => (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: theme.colors.textPrimary }} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textFaint }}>
                  {groupDm.members.length} members
                </Text>
              </View>
            ),
          }
        : {}),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <HuddleHeaderButton channelId={channelId} />
          <Pressable testID="dm-options-button" onPress={handleShowOptions} hitSlop={8}>
            <Text style={{ color: theme.brand.primary, fontSize: 20 }}>...</Text>
          </Pressable>
        </View>
      ),
    });
  }, [dm, groupDm, displayName, handleShowOptions, navigation, router, theme.brand.primary, theme.colors.textPrimary, theme.colors.textFaint]);

  // Select the DM or group DM in state
  useEffect(() => {
    if (!dmChannelId) return;
    if (groupDm) {
      dispatch({ type: "workspace/selectGroupDm", channelId: dmChannelId });
    } else {
      dispatch({ type: "workspace/selectDm", channelId: dmChannelId });
    }
  }, [dmChannelId, dispatch, groupDm]);

  // Load messages
  useEffect(() => {
    if (!workspaceSlug || !dmChannelId) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmChannelId, dispatch, authProvider, workspaceSlug]);

  // Load workspace members for mention autocomplete
  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    void listWorkspaceMembers(deps, workspaceSlug).then((result) => {
      if (cancelled) return;
      setMembers(result.map((m) => ({ id: m.id, displayName: m.displayName })));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, authProvider]);

  // Join/leave socket room
  useEffect(() => {
    if (!dmChannelId) return;
    joinChannel(dmChannelId as Parameters<typeof joinChannel>[0]);
    return () => {
      leaveChannel(dmChannelId as Parameters<typeof leaveChannel>[0]);
    };
  }, [dmChannelId, joinChannel, leaveChannel]);

  // Real-time events
  const onMessageNew = useCallback(
    (message: Message) => {
      dispatch({ type: "messages/upsert", message });
    },
    [dispatch],
  );

  const onMessageUpdated = useCallback(
    (message: Message) => {
      dispatch({ type: "messages/upsert", message });
    },
    [dispatch],
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
      if (payload.channelId === dmChannelId) {
        dispatch({
          type: "messages/updateReactions",
          messageId: payload.messageId,
          reactions: payload.reactions,
        });
      }
    },
    [dmChannelId, dispatch],
  );

  useSocketEvent("message:new", onMessageNew);
  useSocketEvent("message:updated", onMessageUpdated);
  useSocketEvent("message:deleted", onMessageDeleted);
  useSocketEvent("reaction:updated", onReactionUpdated);

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

  const handleSend = useCallback(
    async (content: string) => {
      if (!workspaceSlug || !dmChannelId) return;
      let attachmentIds: string[] = [];
      if (fileUpload.hasFiles) {
        attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
      }
      await coreSendMessage(deps, {
        channelId: dmChannelId,
        workspaceSlug,
        content,
        attachmentIds,
      });
      fileUpload.reset();
    },
    [authProvider, dmChannelId, dispatch, fileUpload, state, workspaceSlug],
  );

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
    setShareMessage(message);
  }, []);

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
      if (!shareMessage || !workspaceSlug) return;
      try {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      keyboardVerticalOffset={insets.top + 56}
    >
      {isLoading && messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          testID="message-list"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const prev = index > 0 ? messages[index - 1] : undefined;
            const isGrouped =
              prev != null &&
              prev.userId === item.userId &&
              new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000 &&
              new Date(item.createdAt).toDateString() === new Date(prev.createdAt).toDateString();
            return (
              <MessageBubble
                message={item}
                isGrouped={isGrouped}
                onPressThread={handlePressThread}
                currentUserId={user?.id}
                onToggleReaction={handleToggleReaction}
                onLongPress={handleLongPress}
                onPressSender={handlePressSender}
                onPressMention={handlePressSender}
                customEmojis={customEmojis}
              />
            );
          }}
          inverted={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
              <Text style={{ color: theme.colors.textFaint }}>No messages yet</Text>
            </View>
          }
          contentContainerStyle={
            messages.length === 0 ? { flex: 1 } : undefined
          }
        />
      )}
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        onSend={handleSend}
        placeholder={`Message ${displayName}`}
        draftKey={dmChannelId}
        editingMessage={editingMessage}
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
      <MessageActionSheet
        visible={actionSheetMessage != null}
        message={actionSheetMessage}
        currentUserId={user?.id}
        isSaved={actionSheetMessage != null && state.savedMessageIds.includes(actionSheetMessage.id)}
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
        onClose={() => setActionSheetMessage(null)}
      />
      <EmojiPickerSheet
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => {
          setShowEmojiPicker(false);
          setEmojiPickerMessageId(null);
        }}
        customEmojis={customEmojis}
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
