import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { Message, ChannelId, MessageId, ReactionGroup } from "@openslaq/shared";
import {
  loadChannelMessages,
  sendMessage as coreSendMessage,
  listWorkspaceMembers,
  leaveChannel as coreLeaveChannel,
  updateChannelDescription,
  setChannelNotificationPrefOp as setChannelNotificationPref,
  starChannelOp,
  unstarChannelOp,
  pinMessageOp,
  unpinMessageOp,
  fetchPinnedMessages,
  saveMessageOp,
  unsaveMessageOp,
  shareMessageOp,
} from "@openslaq/client-core";
import * as Clipboard from "expo-clipboard";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import type { MentionSuggestionItem } from "@/hooks/useMentionAutocomplete";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
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
import { EditTopicModal } from "@/components/EditTopicModal";
import { PinnedMessagesSheet } from "@/components/PinnedMessagesSheet";
import { ShareMessageModal } from "@/components/ShareMessageModal";
import { HuddleHeaderButton } from "@/components/huddle/HuddleHeaderButton";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function ChannelScreen() {
  const { workspaceSlug, channelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const { joinChannel, leaveChannel, socket } = useSocket();
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useMobileTheme();
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
  const [showTopicEdit, setShowTopicEdit] = useState(false);
  const [showPinnedSheet, setShowPinnedSheet] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState<Message | null>(null);

  const { emitTyping } = useTypingEmitter(channelId);
  const typingUsers = useTypingTracking(channelId, user?.id, members);
  const fileUpload = useFileUpload();

  const channel = state.channels.find((c) => c.id === channelId);

  const handleLeaveChannel = useCallback(() => {
    if (!channelId || !workspaceSlug) return;
    Alert.alert("Leave Channel", "Are you sure you want to leave this channel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          const deps = { api, auth: authProvider, dispatch, getState: () => state };
          await coreLeaveChannel(deps, {
            workspaceSlug,
            channelId: channelId as ChannelId,
            socket,
          });
          router.back();
        },
      },
    ]);
  }, [authProvider, channelId, dispatch, router, socket, state, workspaceSlug]);

  const handleNotificationPref = useCallback(() => {
    const currentLevel = state.channelNotificationPrefs[channelId] ?? "all";
    const levels: { label: string; value: ChannelNotifyLevel }[] = [
      { label: "All messages", value: "all" },
      { label: "Mentions only", value: "mentions" },
      { label: "Muted", value: "muted" },
    ];
    Alert.alert(
      "Notifications",
      "Choose notification level for this channel",
      [
        ...levels.map((l) => ({
          text: l.value === currentLevel ? `${l.label} \u2713` : l.label,
          onPress: () => {
            if (l.value !== currentLevel) {
              const deps = { api, auth: authProvider, dispatch, getState: () => state };
              void setChannelNotificationPref(deps, {
                slug: workspaceSlug,
                channelId,
                level: l.value,
              });
            }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [authProvider, channelId, dispatch, state, workspaceSlug]);

  const isStarred = state.starredChannelIds.includes(channelId);

  const handleToggleStar = useCallback(() => {
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    if (isStarred) {
      void unstarChannelOp(deps, { slug: workspaceSlug, channelId });
    } else {
      void starChannelOp(deps, { slug: workspaceSlug, channelId });
    }
  }, [authProvider, channelId, dispatch, isStarred, state, workspaceSlug]);

  const handleShowOptions = useCallback(() => {
    Alert.alert("Channel Options", undefined, [
      {
        text: isStarred ? "Unstar Channel" : "Star Channel",
        onPress: handleToggleStar,
      },
      {
        text: "View Members",
        onPress: () =>
          router.push({
            pathname: "/(app)/[workspaceSlug]/(tabs)/(channels)/channel-members",
            params: { workspaceSlug, channelId },
          }),
      },
      {
        text: "Edit Topic",
        onPress: () => setShowTopicEdit(true),
      },
      {
        text: "Notifications",
        onPress: handleNotificationPref,
      },
      {
        text: "Leave Channel",
        style: "destructive",
        onPress: handleLeaveChannel,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [channelId, handleLeaveChannel, handleNotificationPref, handleToggleStar, isStarred, router, workspaceSlug]);

  // Select the channel in state
  useEffect(() => {
    if (channelId) {
      dispatch({ type: "workspace/selectChannel", channelId });
    }
  }, [channelId, dispatch]);

  // Load messages
  useEffect(() => {
    if (!workspaceSlug || !channelId) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void loadChannelMessages(deps, { workspaceSlug, channelId }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dispatch, authProvider, workspaceSlug]);

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

  // Join/leave socket room
  useEffect(() => {
    if (!channelId) return;
    joinChannel(channelId as Parameters<typeof joinChannel>[0]);
    return () => {
      leaveChannel(channelId as Parameters<typeof leaveChannel>[0]);
    };
  }, [channelId, joinChannel, leaveChannel]);

  // Real-time message events
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

  // Get messages for this channel
  const messageIds = channelId
    ? state.channelMessageIds[channelId] ?? []
    : [];
  const messages = messageIds
    .map((id) => state.messagesById[id])
    .filter((m): m is Message => Boolean(m));

  const pinCount = messages.filter((m) => m.isPinned).length;

  const handleOpenPinnedMessages = useCallback(async () => {
    if (!workspaceSlug || !channelId) return;
    setShowPinnedSheet(true);
    setPinnedLoading(true);
    try {
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      const msgs = await fetchPinnedMessages(deps, { workspaceSlug, channelId });
      setPinnedMessages(msgs);
    } finally {
      setPinnedLoading(false);
    }
  }, [authProvider, channelId, dispatch, state, workspaceSlug]);

  const handlePinMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await pinMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleUnpinMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await unpinMessageOp(deps, { workspaceSlug, channelId, messageId });
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleSaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await saveMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleUnsaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await unsaveMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
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
      const link = `openslaq://${workspaceSlug}/c/${channelId}/p/${message.id}`;
      void Clipboard.setStringAsync(link);
      Alert.alert("Copied", "Message link copied to clipboard");
    },
    [workspaceSlug, channelId],
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

  // Set the header title and options button
  useEffect(() => {
    if (channel) {
      navigation.setOptions({
        title: `# ${channel.name}`,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <HuddleHeaderButton channelId={channel.id} />
            {pinCount > 0 && (
              <Pressable testID="pinned-messages-button" onPress={handleOpenPinnedMessages} hitSlop={8}>
                <Text style={{ color: theme.brand.primary, fontSize: 14 }}>
                  {"\u{1F4CC}"}{pinCount}
                </Text>
              </Pressable>
            )}
            <Pressable testID="channel-options-button" onPress={handleShowOptions} hitSlop={8}>
              <Text style={{ color: theme.brand.primary, fontSize: 20 }}>...</Text>
            </Pressable>
          </View>
        ),
      });
    }
  }, [channel, handleOpenPinnedMessages, handleShowOptions, navigation, pinCount, theme.brand.primary]);

  const isLoading = channelId
    ? state.ui.channelMessagesLoading[channelId]
    : false;

  const handlePressThread = useCallback(
    (messageId: string) => {
      router.push(`/${workspaceSlug}/thread/${messageId}`);
    },
    [router, workspaceSlug],
  );

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
      if (!workspaceSlug || !channelId) return;
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
      });
      fileUpload.reset();
    },
    [authProvider, channelId, dispatch, fileUpload, state, workspaceSlug],
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

  const handleSaveTopic = useCallback(
    async (description: string | null) => {
      if (!workspaceSlug || !channelId) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await updateChannelDescription(deps, {
        workspaceSlug,
        channelId: channelId as ChannelId,
        description,
      });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      keyboardVerticalOffset={90}
    >
      {isLoading && messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <>
        {channel?.description && (
          <Pressable
            testID="channel-description-banner"
            onPress={() => setShowTopicEdit(true)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: theme.colors.surfaceSecondary,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
            }}
          >
            <Text
              testID="channel-description-text"
              numberOfLines={2}
              style={{ color: theme.colors.textSecondary, fontSize: 13 }}
            >
              {channel.description}
            </Text>
          </Pressable>
        )}
        <FlatList
          testID="message-list"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onPressThread={handlePressThread}
              currentUserId={user?.id}
              onToggleReaction={handleToggleReaction}
              onLongPress={handleLongPress}
              onPressSender={handlePressSender}
            />
          )}
          inverted={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text style={{ color: theme.colors.textFaint }}>No messages yet</Text>
            </View>
          }
          contentContainerStyle={
            messages.length === 0 ? { flex: 1 } : undefined
          }
        />
        </>
      )}
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        onSend={handleSend}
        placeholder={channel ? `Message #${channel.name}` : "Message"}
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
        isSaved={actionSheetMessage != null && state.savedMessageIds.includes(actionSheetMessage.id)}
        onReaction={handleToggleReaction}
        onOpenEmojiPicker={handleOpenEmojiPicker}
        onEditMessage={handleStartEdit}
        onDeleteMessage={handleDeleteMessage}
        onPinMessage={handlePinMessage}
        onUnpinMessage={handleUnpinMessage}
        onSaveMessage={handleSaveMessage}
        onUnsaveMessage={handleUnsaveMessage}
        onCopyText={handleCopyText}
        onCopyLink={handleCopyLink}
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
      <EditTopicModal
        visible={showTopicEdit}
        onClose={() => setShowTopicEdit(false)}
        currentDescription={channel?.description}
        onSave={handleSaveTopic}
      />
      <PinnedMessagesSheet
        visible={showPinnedSheet}
        messages={pinnedMessages}
        loading={pinnedLoading}
        onUnpin={(messageId) => void handleUnpinMessage(messageId)}
        onClose={() => setShowPinnedSheet(false)}
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
