import { useCallback, useEffect } from "react";
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
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { Message, ChannelId, MessageId, ReactionGroup, SlashCommandDefinition, ChannelEventMessage, HuddleMessage } from "@openslaq/shared";
import {
  loadChannelMessages,
  loadOlderMessages,
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
  fetchSlashCommands,
  executeSlashCommand,
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
import { useFetchData } from "@/hooks/useFetchData";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useChannelModals } from "@/hooks/useChannelModals";
import { useFileUpload, type PendingFile } from "@/hooks/useFileUpload";
import { MessageBubble } from "@/components/MessageBubble";
import { ChannelEventSystemMessage } from "@/components/ChannelEventSystemMessage";
import { HuddleSystemMessage } from "@/components/HuddleSystemMessage";
import { EphemeralMessageBubble } from "@/components/EphemeralMessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageActionSheet } from "@/components/MessageActionSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { EditTopicModal } from "@/components/EditTopicModal";
import { PinnedMessagesSheet } from "@/components/PinnedMessagesSheet";
import { ShareMessageModal } from "@/components/ShareMessageModal";
import { NotificationLevelSheet } from "@/components/NotificationLevelSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pin, ChevronDown } from "lucide-react-native";
import { HuddleHeaderButton } from "@/components/huddle/HuddleHeaderButton";
import { ChannelInfoPanel } from "@/components/ChannelInfoPanel.variant-a";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { routes } from "@/lib/routes";

export default function ChannelScreen() {
  const { workspaceSlug, channelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const { joinChannel, leaveChannel, socket } = useSocket();
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions(user?.id);

  const modals = useChannelModals();

  // Load workspace members for mention autocomplete
  const { data: members } = useFetchData({
    fetchFn: async () => {
      const result = await listWorkspaceMembers(deps, workspaceSlug!);
      return result.map((m: { id: string; displayName: string }) => ({ id: m.id, displayName: m.displayName }));
    },
    deps: [workspaceSlug, authProvider],
    enabled: !!workspaceSlug,
    initialValue: [] as MentionSuggestionItem[],
  });

  // Load slash commands
  const { data: slashCommands } = useFetchData({
    fetchFn: () => fetchSlashCommands(deps, { workspaceSlug: workspaceSlug! }),
    deps: [workspaceSlug, authProvider],
    enabled: !!workspaceSlug,
    initialValue: [] as SlashCommandDefinition[],
  });

  const { emitTyping } = useTypingEmitter(channelId);
  const typingUsers = useTypingTracking(channelId, user?.id, members);
  const fileUpload = useFileUpload();

  const channel = state.channels.find((c) => c.id === channelId);
  const customEmojis = state.customEmojis;

  const handleLeaveChannel = useCallback(() => {
    if (!channelId || !workspaceSlug) return;
    Alert.alert("Leave Channel", "Are you sure you want to leave this channel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
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
    modals.setShowNotificationSheet(true);
  }, []);

  const handleNotificationSelect = useCallback(
    (level: ChannelNotifyLevel) => {
      void setChannelNotificationPref(deps, {
        slug: workspaceSlug,
        channelId,
        level,
      });
      modals.setShowNotificationSheet(false);
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const isStarred = state.starredChannelIds.includes(channelId);

  const handleToggleStar = useCallback(() => {
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
        onPress: () => modals.setShowTopicEdit(true),
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
    void loadChannelMessages(deps, { workspaceSlug, channelId }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dispatch, authProvider, workspaceSlug]);

  const handleSlashCommand = useCallback(
    async (command: string, args: string) => {
      if (!workspaceSlug || !channelId) return;
      try {
          const result = await executeSlashCommand(deps, {
          workspaceSlug,
          channelId,
          command,
          args,
        });
        if (result.ephemeralMessages?.length) {
          modals.setEphemeralMessages((prev) => [...prev, ...result.ephemeralMessages!]);
        }
      } catch {
        modals.setEphemeralMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            channelId: channelId as ChannelId,
            text: `Command /${command} failed. Please try again.`,
            senderName: "Slaqbot",
            senderAvatarUrl: null,
            createdAt: new Date().toISOString(),
            ephemeral: true,
          },
        ]);
      }
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

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
    modals.setShowPinnedSheet(true);
    modals.setPinnedLoading(true);
    try {
      const msgs = await fetchPinnedMessages(deps, { workspaceSlug, channelId });
      modals.setPinnedMessages(msgs);
    } finally {
      modals.setPinnedLoading(false);
    }
  }, [authProvider, channelId, dispatch, state, workspaceSlug]);

  const handlePinMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug) return;
      await pinMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleUnpinMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug) return;
      await unpinMessageOp(deps, { workspaceSlug, channelId, messageId });
      modals.setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleSaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
      await saveMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleUnsaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
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

  const handleMarkAsUnread = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
      await markChannelAsUnread(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  const handleShareMessage = useCallback((message: Message) => {
    modals.setShareMessage(message);
  }, []);

  const handleConfirmShare = useCallback(
    async (destinationChannelId: string, destinationName: string, comment: string) => {
      if (!modals.shareMessage || !workspaceSlug) return;
      try {
          await shareMessageOp(deps, {
          workspaceSlug,
          destinationChannelId,
          sharedMessageId: modals.shareMessage.id,
          comment,
        });
        Alert.alert("Shared", `Message shared to ${destinationName}`);
      } catch {
        Alert.alert("Error", "Failed to share message");
      }
      modals.setShareMessage(null);
    },
    [authProvider, dispatch, modals.shareMessage, state, workspaceSlug],
  );

  // Set the header title and options button
  const currentNotifLevel = state.channelNotificationPrefs[channelId] ?? "all";

  const handleOpenChannelInfo = useCallback(() => {
    modals.setShowChannelInfo(true);
  }, []);

  useEffect(() => {
    if (channel) {
      const isMuted = currentNotifLevel === "muted";
      const titleText = isMuted ? `# ${channel.name} 🔇` : `# ${channel.name}`;
      navigation.setOptions({
        headerTitle: () => (
          <Pressable testID="channel-title-button" onPress={handleOpenChannelInfo} hitSlop={8}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                backgroundColor: theme.colors.surfaceTertiary,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "600", color: theme.colors.textPrimary }}>{titleText}</Text>
              <ChevronDown size={14} color={theme.colors.textMuted} />
            </View>
          </Pressable>
        ),
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <HuddleHeaderButton channelId={channel.id} />
            {pinCount > 0 && (
              <Pressable testID="pinned-messages-button" onPress={handleOpenPinnedMessages} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Pin size={14} color={theme.brand.primary} />
                <Text style={{ color: theme.brand.primary, fontSize: 14 }}>{pinCount}</Text>
              </Pressable>
            )}
            <Pressable testID="channel-options-button" onPress={handleShowOptions} hitSlop={8}>
              <Text style={{ color: theme.brand.primary, fontSize: 20 }}>...</Text>
            </Pressable>
          </View>
        ),
      });
    }
  }, [channel, currentNotifLevel, handleOpenChannelInfo, handleOpenPinnedMessages, handleShowOptions, navigation, pinCount, theme.brand.primary, theme.colors.textMuted, theme.colors.textPrimary, theme.colors.surfaceTertiary]);

  const isLoading = channelId
    ? state.ui.channelMessagesLoading[channelId]
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
      if (!workspaceSlug || !channelId) return;
      const file: PendingFile = {
        id: `voice-${Date.now()}`,
        uri,
        name: `voice-message-${Date.now()}.m4a`,
        mimeType: "audio/mp4",
        isImage: false,
      };
      fileUpload.addFile(file);
      const attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
      await coreSendMessage(deps, { channelId, workspaceSlug, content: "", attachmentIds });
      fileUpload.reset();
    },
    [authProvider, channelId, dispatch, fileUpload, state, workspaceSlug],
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
    modals.setEditingMessage({ id: message.id, content: message.content });
  }, []);

  const handleCancelEdit = useCallback(() => {
    modals.setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      await handleEditMessage(messageId, content);
      modals.setEditingMessage(null);
    },
    [handleEditMessage],
  );

  const handleLongPress = useCallback((message: Message) => {
    modals.setActionSheetMessage(message);
  }, []);

  const handleOpenEmojiPicker = useCallback(() => {
    if (modals.actionSheetMessage) {
      modals.setEmojiPickerMessageId(modals.actionSheetMessage.id);
    }
    modals.setShowEmojiPicker(true);
  }, [modals.actionSheetMessage]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (modals.emojiPickerMessageId) {
        handleToggleReaction(modals.emojiPickerMessageId, emoji);
      }
      modals.setShowEmojiPicker(false);
      modals.setEmojiPickerMessageId(null);
    },
    [modals.emojiPickerMessageId, handleToggleReaction],
  );

  const handleScheduleSend = useCallback(
    async (content: string, scheduledFor: Date) => {
      if (!workspaceSlug || !channelId) return;
      try {
          let attachmentIds: string[] = [];
        if (fileUpload.hasFiles) {
          attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
        }
        await createScheduledMessageOp(deps, {
          workspaceSlug,
          channelId,
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
    [authProvider, channelId, dispatch, fileUpload, state, workspaceSlug],
  );

  const handleSaveTopic = useCallback(
    async (description: string | null) => {
      if (!workspaceSlug || !channelId) return;
      await updateChannelDescription(deps, {
        workspaceSlug,
        channelId: channelId as ChannelId,
        description,
      });
    },
    [authProvider, channelId, dispatch, state, workspaceSlug],
  );

  // Older message pagination
  const pagination = channelId ? state.channelPagination[channelId] : undefined;

  const handleLoadOlder = useCallback(() => {
    if (!pagination?.hasOlder || pagination.loadingOlder || !pagination.olderCursor) return;
    if (!workspaceSlug || !channelId) return;
    void loadOlderMessages(deps, { workspaceSlug, channelId, cursor: pagination.olderCursor });
  }, [authProvider, channelId, dispatch, pagination, state, workspaceSlug]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (event.nativeEvent.contentOffset.y < 200) {
        handleLoadOlder();
      }
    },
    [handleLoadOlder],
  );

  if (!channel) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

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
        <>
        <FlatList
          testID="message-list"
          data={messages}
          keyExtractor={(item) => item.id}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
          ListHeaderComponent={
            pagination?.loadingOlder ? (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <ActivityIndicator size="small" color={theme.brand.primary} />
              </View>
            ) : undefined
          }
          renderItem={({ item, index }) => {
            if (item.type === "channel_event") {
              return <ChannelEventSystemMessage message={item as ChannelEventMessage} />;
            }
            if (item.type === "huddle") {
              return <HuddleSystemMessage message={item as HuddleMessage} />;
            }
            const prev = index > 0 ? messages[index - 1] : undefined;
            const isGrouped =
              prev != null &&
              prev.type !== "channel_event" &&
              prev.type !== "huddle" &&
              item.type !== "channel_event" &&
              item.type !== "huddle" &&
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
          ListFooterComponent={
            modals.ephemeralMessages.length > 0 ? (
              <View testID="ephemeral-messages">
                {modals.ephemeralMessages.map((msg) => (
                  <EphemeralMessageBubble key={msg.id} message={msg} />
                ))}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
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
        draftKey={channelId}
        editingMessage={modals.editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        members={members}
        onTyping={emitTyping}
        pendingFiles={fileUpload.pendingFiles}
        onAddAttachment={handleAddAttachment}
        onRemoveFile={fileUpload.removeFile}
        uploading={fileUpload.uploading}
        slashCommands={slashCommands}
        onSlashCommand={handleSlashCommand}
        onScheduleSend={handleScheduleSend}
        onSendVoiceMessage={handleSendVoiceMessage}
      />
      <MessageActionSheet
        visible={modals.actionSheetMessage != null}
        message={modals.actionSheetMessage}
        currentUserId={user?.id}
        isSaved={modals.actionSheetMessage != null && state.savedMessageIds.includes(modals.actionSheetMessage.id)}
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
        onMarkAsUnread={handleMarkAsUnread}
        onShareMessage={handleShareMessage}
        onClose={() => modals.setActionSheetMessage(null)}
      />
      <EmojiPickerSheet
        visible={modals.showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => {
          modals.setShowEmojiPicker(false);
          modals.setEmojiPickerMessageId(null);
        }}
        customEmojis={customEmojis}
      />
      <EditTopicModal
        visible={modals.showTopicEdit}
        onClose={() => modals.setShowTopicEdit(false)}
        currentDescription={channel?.description}
        onSave={handleSaveTopic}
      />
      <PinnedMessagesSheet
        visible={modals.showPinnedSheet}
        messages={modals.pinnedMessages}
        loading={modals.pinnedLoading}
        onUnpin={(messageId) => void handleUnpinMessage(messageId)}
        onClose={() => modals.setShowPinnedSheet(false)}
      />
      <ShareMessageModal
        visible={modals.shareMessage != null}
        message={modals.shareMessage}
        channels={state.channels.filter((c) => !c.isArchived)}
        dms={state.dms}
        groupDms={state.groupDms}
        onShare={handleConfirmShare}
        onClose={() => modals.setShareMessage(null)}
      />
      <NotificationLevelSheet
        visible={modals.showNotificationSheet}
        currentLevel={currentNotifLevel}
        onSelect={handleNotificationSelect}
        onClose={() => modals.setShowNotificationSheet(false)}
      />
      <ChannelInfoPanel
        visible={modals.showChannelInfo}
        channel={channel}
        isStarred={isStarred}
        notificationLevel={currentNotifLevel}
        pinCount={pinCount}
        onToggleStar={handleToggleStar}
        onNotificationPress={() => modals.setShowNotificationSheet(true)}
        onViewMembers={() => {
          modals.setShowChannelInfo(false);
          router.push({
            pathname: "/(app)/[workspaceSlug]/(tabs)/(channels)/channel-members",
            params: { workspaceSlug, channelId },
          });
        }}
        onViewPinned={() => {
          modals.setShowChannelInfo(false);
          void handleOpenPinnedMessages();
        }}
        onViewFiles={() => {
          modals.setShowChannelInfo(false);
        }}
        onEditTopic={() => {
          modals.setShowChannelInfo(false);
          modals.setShowTopicEdit(true);
        }}
        onLeaveChannel={() => {
          modals.setShowChannelInfo(false);
          handleLeaveChannel();
        }}
        onClose={() => modals.setShowChannelInfo(false)}
      />
    </KeyboardAvoidingView>
  );
}
