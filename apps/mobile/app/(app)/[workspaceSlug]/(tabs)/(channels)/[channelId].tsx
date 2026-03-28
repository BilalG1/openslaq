import { useCallback, useEffect, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import type { Message, ChannelId, UserId, SlashCommandDefinition } from "@openslaq/shared";
import { asUserId, asMessageId } from "@openslaq/shared";
import type { MobileTheme } from "@openslaq/shared";
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
  archiveChannel,
} from "@openslaq/client-core";
import * as Clipboard from "expo-clipboard";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import type { MentionSuggestionItem } from "@/components/MentionSuggestionList";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useFetchData } from "@/hooks/useFetchData";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useChannelSocketEvents } from "@/hooks/useChannelSocketEvents";
import { useFileUpload, type PendingFile } from "@/hooks/useFileUpload";
import { ChannelMessageList } from "@/components/ChannelMessageList";
import type { ChannelMessageListRef } from "@/components/ChannelMessageList";
import { MessageInput } from "@/components/MessageInput";
import type { MessageInputRef } from "@/components/MessageInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageActionSheet } from "@/components/MessageActionSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { PinnedMessagesSheet } from "@/components/PinnedMessagesSheet";
import { ShareMessageModal } from "@/components/ShareMessageModal";
import { NotificationLevelSheet } from "@/components/NotificationLevelSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/utils/haptics";
import { ChevronDown, Lock } from "lucide-react-native";
import { HuddleHeaderButton } from "@/components/huddle/HuddleHeaderButton";
import { ChannelInfoPanel } from "@/components/ChannelInfoPanel.variant-a";
import { ReactionDetailsSheet } from "@/components/ReactionDetailsSheet";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { routes } from "@/lib/routes";
import { env } from "@/lib/env";
import { useChannelParams } from "@/hooks/useRouteParams";
import {
  ChannelModalsProvider,
  useChannelModalsState,
  useChannelModalsDispatch,
} from "@/contexts/ChannelModalsContext";

export default function ChannelScreen() {
  return (
    <ChannelModalsProvider>
      <ChannelScreenInner />
    </ChannelModalsProvider>
  );
}

function ChannelScreenInner() {
  const { workspaceSlug, channelId, showInfo } = useChannelParams();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const { socket } = useSocket();
  const currentUserId = user?.id ? asUserId(user.id) : undefined;
  const { joinChannel, leaveChannel } = useChannelSocketEvents(channelId);
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions(currentUserId);
  const messageListRef = useRef<ChannelMessageListRef>(null);
  const messageInputRef = useRef<MessageInputRef>(null);
  const styles = makeStyles(theme);

  const modalsState = useChannelModalsState();
  const modalsDispatch = useChannelModalsDispatch();

  // Open channel info panel when navigated with ?showInfo=true
  useEffect(() => {
    if (showInfo) {
      modalsDispatch({ type: "showChannelInfo" });
    }
  }, [showInfo, modalsDispatch]);

  const { data: members } = useFetchData({
    fetchFn: async () => {
      const result = await listWorkspaceMembers(deps, workspaceSlug!);
      return result.map((m) => ({ id: m.id, displayName: m.displayName }));
    },
    deps: [workspaceSlug, authProvider],
    enabled: !!workspaceSlug,
    initialValue: [] as MentionSuggestionItem[],
  });

  const { data: slashCommands } = useFetchData({
    fetchFn: () => fetchSlashCommands(deps, { workspaceSlug: workspaceSlug! }),
    deps: [workspaceSlug, authProvider],
    enabled: !!workspaceSlug,
    initialValue: [] as SlashCommandDefinition[],
  });

  const { emitTyping } = useTypingEmitter(channelId);
  const typingUsers = useTypingTracking(channelId, currentUserId, members as { id: UserId; displayName: string }[]);
  const fileUpload = useFileUpload();

  const channel = state.channels.find((c) => c.id === channelId);
  const prevChannelRef = useRef(channel);
  if (channel) prevChannelRef.current = channel;

  useEffect(() => {
    if (!channel && prevChannelRef.current) {
      const name = prevChannelRef.current.name;
      router.back();
      Alert.alert("Removed from channel", `You are no longer a member of #${name}.`);
    }
  }, [channel, router]);

  const customEmojis = state.customEmojis;
  const scrollTarget = state.scrollTarget;
  const workspace = state.workspaces.find((item) => item.slug === workspaceSlug);
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";

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
            channelId: channelId!,
            socket,
          });
          router.back();
        },
      },
    ]);
  }, [authProvider, channelId, dispatch, router, socket, workspaceSlug]);


  const handleNotificationSelect = useCallback(
    (level: ChannelNotifyLevel) => {
      void setChannelNotificationPref(deps, {
        slug: workspaceSlug!,
        channelId: channelId!,
        level,
      });
      modalsDispatch({ type: "closeNotificationSheet" });
    },
    [authProvider, channelId, dispatch, modalsDispatch, workspaceSlug],
  );

  const isStarred = channelId ? state.starredChannelIds.includes(channelId) : false;

  const handleToggleStar = useCallback(() => {
    if (isStarred) {
      void unstarChannelOp(deps, { slug: workspaceSlug!, channelId: channelId! });
    } else {
      void starChannelOp(deps, { slug: workspaceSlug!, channelId: channelId! });
    }
  }, [authProvider, channelId, dispatch, isStarred, workspaceSlug]);

  const handleArchiveChannel = useCallback(() => {
    if (!workspaceSlug || !channelId || !channel) return;
    Alert.alert(
      "Archive Channel",
      `Are you sure you want to archive #${channel.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void archiveChannel(deps, { workspaceSlug, channelId: channelId! });
          },
        },
      ],
    );
  }, [channel, channelId, deps, workspaceSlug]);


  // Select channel + load messages (consolidated)
  useEffect(() => {
    if (!channelId) return;
    dispatch({ type: "workspace/selectChannel", channelId });
    if (!workspaceSlug) return;
    let cancelled = false;
    void loadChannelMessages(deps, { workspaceSlug, channelId }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
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
          modalsDispatch({ type: "addEphemeralMessages", messages: result.ephemeralMessages });
        }
      } catch {
        modalsDispatch({
          type: "addEphemeralMessages",
          messages: [{
            id: `error-${Date.now()}`,
            channelId: channelId!,
            text: `Command /${command} failed. Please try again.`,
            senderName: "Slaqbot",
            senderAvatarUrl: null,
            createdAt: new Date().toISOString(),
            ephemeral: true,
          }],
        });
      }
    },
    [authProvider, channelId, dispatch, modalsDispatch, workspaceSlug],
  );

  // Join/leave socket room
  useEffect(() => {
    if (!channelId) return;
    joinChannel(channelId!);
    return () => {
      leaveChannel(channelId!);
    };
  }, [channelId, joinChannel, leaveChannel]);

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
    modalsDispatch({ type: "showPinnedSheet" });
    modalsDispatch({ type: "setPinnedLoading", loading: true });
    try {
      const msgs = await fetchPinnedMessages(deps, { workspaceSlug, channelId });
      modalsDispatch({ type: "setPinnedMessages", messages: msgs });
    } finally {
      modalsDispatch({ type: "setPinnedLoading", loading: false });
    }
  }, [authProvider, channelId, dispatch, modalsDispatch, workspaceSlug]);

  const handlePinMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug) return;
      await pinMessageOp(deps, { workspaceSlug: workspaceSlug!, channelId: channelId!, messageId });
    },
    [authProvider, channelId, dispatch, workspaceSlug],
  );

  const handleUnpinMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug) return;
      await unpinMessageOp(deps, { workspaceSlug: workspaceSlug!, channelId: channelId!, messageId });
      modalsDispatch({ type: "removePinnedMessage", messageId: asMessageId(messageId) });
    },
    [authProvider, channelId, dispatch, modalsDispatch, workspaceSlug],
  );

  const handleSaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
      await saveMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, workspaceSlug],
  );

  const handleUnsaveMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceSlug || !channelId) return;
      await unsaveMessageOp(deps, { workspaceSlug, channelId, messageId });
    },
    [authProvider, channelId, dispatch, workspaceSlug],
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
      const link = routes.messageDeepLink(workspaceSlug!, channelId!, message.id);
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
    [authProvider, channelId, dispatch, workspaceSlug],
  );

  const handleShareMessage = useCallback((message: Message) => {
    modalsDispatch({ type: "showShareMessage", message });
  }, [modalsDispatch]);

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
    [authProvider, dispatch, modalsDispatch, modalsState.shareMessage, workspaceSlug],
  );

  const currentNotifLevel = channelId ? state.channelNotificationPrefs[channelId] ?? "all" : "all";

  const handleOpenChannelInfo = useCallback(() => {
    messageInputRef.current?.dismissKeyboard();
    haptics.light();
    modalsDispatch({ type: "showChannelInfo" });
  }, [modalsDispatch]);

  useEffect(() => {
    if (channel) {
      const isMuted = currentNotifLevel === "muted";
      const isPrivate = channel.type === "private";
      const prefix = isPrivate ? <Lock size={14} color={theme.colors.textPrimary} testID="channel-header-lock-icon" /> : <Text style={styles.headerTitleText}># </Text>;
      const mutedSuffix = isMuted ? " \u{1F507}" : "";
      navigation.setOptions({
        headerTitle: () => (
          <Pressable testID="channel-title-button" onPress={handleOpenChannelInfo} hitSlop={12} style={styles.headerTitleTouchable} accessibilityRole="button" accessibilityLabel={`${isPrivate ? "Private channel" : "Channel"} ${channel.name}`} accessibilityHint="Opens channel info">
            <View style={styles.headerTitlePill}>
              {prefix}<Text style={styles.headerTitleText}>{channel.name}{mutedSuffix}</Text>
              <ChevronDown size={14} color={theme.colors.textMuted} />
            </View>
          </Pressable>
        ),
        headerRight: () => (
          <View style={styles.headerRight}>
            <HuddleHeaderButton channelId={channel.id} />
          </View>
        ),
      });
    }
  }, [channel, currentNotifLevel, handleOpenChannelInfo, navigation, theme.colors.textMuted, theme.colors.textPrimary, theme.colors.surfaceTertiary]);

  const isLoading = channelId
    ? state.ui.channelMessagesLoading[channelId]
    : false;

  const handlePressThread = useCallback(
    (messageId: string) => {
      router.push(routes.thread(workspaceSlug!, messageId));
    },
    [router, workspaceSlug],
  );

  const handlePressSender = useCallback(
    (userId: string) => {
      router.push(routes.profile(workspaceSlug!, userId));
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
      await coreSendMessage(deps, { channelId, workspaceSlug, content: "", attachmentIds, userId: user?.id });
      fileUpload.reset();
    },
    [authProvider, channelId, dispatch, fileUpload, workspaceSlug],
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
    async (content: string): Promise<boolean> => {
      if (!workspaceSlug || !channelId) return false;
      try {
        let attachmentIds: string[] = [];
        const pendingAttachments = fileUpload.pendingFiles.map((f) => ({
          id: f.id,
          filename: f.name,
          mimeType: f.mimeType,
        }));
        if (fileUpload.hasFiles) {
          attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
        }
        const ok = await coreSendMessage(deps, {
          channelId,
          workspaceSlug,
          content,
          attachmentIds,
          pendingAttachments,
          userId: user?.id,
        });
        if (ok) {
          fileUpload.reset();
          messageListRef.current?.scrollToBottom();
        }
        return ok;
      } catch {
        Alert.alert("Error", "Failed to send message. Please try again.");
        return false;
      }
    },
    [authProvider, channelId, dispatch, fileUpload, workspaceSlug],
  );

  const handleStartEdit = useCallback((message: Message) => {
    modalsDispatch({ type: "setEditingMessage", message: { id: message.id, content: message.content } });
  }, [modalsDispatch]);

  const handleCancelEdit = useCallback(() => {
    modalsDispatch({ type: "setEditingMessage", message: null });
  }, [modalsDispatch]);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      await handleEditMessage(asMessageId(messageId), content);
      modalsDispatch({ type: "setEditingMessage", message: null });
    },
    [handleEditMessage, modalsDispatch],
  );

  const handleLongPress = useCallback((message: Message) => {
    messageInputRef.current?.dismissKeyboard();
    modalsDispatch({ type: "showActionSheet", message });
  }, [modalsDispatch]);

  const handleAddReaction = useCallback((message: Message) => {
    messageInputRef.current?.dismissKeyboard();
    modalsDispatch({ type: "showEmojiPicker", messageId: message.id });
  }, [modalsDispatch]);

  const handleLongPressReaction = useCallback((message: Message, emoji: string) => {
    messageInputRef.current?.dismissKeyboard();
    const reaction = message.reactions?.find((r) => r.emoji === emoji);
    if (!reaction) return;
    modalsDispatch({ type: "showReactionDetails", emoji, userIds: reaction.userIds, messageId: message.id });
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
    [authProvider, channelId, dispatch, fileUpload, workspaceSlug],
  );

  const handleSaveTopic = useCallback(
    async (description: string | null) => {
      if (!workspaceSlug || !channelId) return;
      await updateChannelDescription(deps, {
        workspaceSlug,
        channelId: channelId!,
        description,
      });
    },
    [authProvider, channelId, dispatch, workspaceSlug],
  );

  const pagination = channelId ? state.channelPagination[channelId] : undefined;

  const handleLoadOlder = useCallback(() => {
    if (!pagination?.hasOlder || pagination.loadingOlder || !pagination.olderCursor) return;
    if (!workspaceSlug || !channelId) return;
    void loadOlderMessages(deps, { workspaceSlug, channelId, cursor: pagination.olderCursor });
  }, [authProvider, channelId, dispatch, pagination, workspaceSlug]);

  const handleBotAction = useCallback(
    async (messageId: string, actionId: string) => {
      try {
        const token = await authProvider.requireAccessToken();
        const apiUrl = env.EXPO_PUBLIC_API_URL;
        const res = await fetch(
          `${apiUrl}/api/bot-interactions/${messageId}/actions/${actionId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          console.error("Bot action failed:", res.status);
        }
      } catch (err) {
        console.error("Bot action error:", err);
      }
    },
    [authProvider, deps],
  );

  if (!channel) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

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
          ref={messageListRef}
          channelId={channelId!}
          messages={messages}
          customEmojis={customEmojis}
          currentUserId={currentUserId}
          ephemeralMessages={modalsState.ephemeralMessages}
          scrollTarget={scrollTarget}
          isLoading={isLoading ?? false}
          pagination={pagination}
          onPressThread={handlePressThread}
          onPressSender={handlePressSender}
          onToggleReaction={(messageId, emoji) => {
            handleToggleReaction(messageId, emoji);
            messageListRef.current?.scrollToBottom();
          }}
          onLongPress={handleLongPress}
          onAddReaction={handleAddReaction}
          onLongPressReaction={handleLongPressReaction}
          onLoadOlder={handleLoadOlder}
          onBotAction={handleBotAction}
        />
      )}
      <TypingIndicator typingUsers={typingUsers} />
      {channel.isArchived ? (
        <View style={styles.archivedBanner} testID="archived-banner">
          <Text style={styles.archivedText}>This channel has been archived</Text>
        </View>
      ) : (
        <MessageInput
          ref={messageInputRef}
          onSend={handleSend}
          placeholder={channel ? `Message #${channel.name}` : "Message"}
          draftKey={channelId}
          editingMessage={modalsState.editingMessage}
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
      )}
      {modalsState.actionSheetMessage && (
        <MessageActionSheet
          visible
          message={modalsState.actionSheetMessage}
          currentUserId={currentUserId}
          isSaved={state.savedMessageIds.includes(modalsState.actionSheetMessage.id)}
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
      {modalsState.showPinnedSheet && (
        <PinnedMessagesSheet
          visible
          messages={modalsState.pinnedMessages}
          loading={modalsState.pinnedLoading}
          onUnpin={(messageId) => void handleUnpinMessage(messageId)}
          onClose={() => modalsDispatch({ type: "closePinnedSheet" })}
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
      {modalsState.showNotificationSheet && (
        <NotificationLevelSheet
          visible
          currentLevel={currentNotifLevel}
          onSelect={handleNotificationSelect}
          onClose={() => modalsDispatch({ type: "closeNotificationSheet" })}
        />
      )}
      {modalsState.showChannelInfo && (
        <ChannelInfoPanel
          visible
          channel={channel}
          isStarred={isStarred}
          notificationLevel={currentNotifLevel}
          pinCount={pinCount}
          onToggleStar={handleToggleStar}
          onNotificationPress={() => {
            modalsDispatch({ type: "closeChannelInfo" });
            modalsDispatch({ type: "showNotificationSheet" });
          }}
          onViewMembers={() => {
            modalsDispatch({ type: "closeChannelInfo" });
            router.push({
              pathname: "/(app)/[workspaceSlug]/(tabs)/(channels)/channel-members",
              params: { workspaceSlug: workspaceSlug!, channelId: channelId! },
            });
          }}
          onViewPinned={() => {
            modalsDispatch({ type: "closeChannelInfo" });
            void handleOpenPinnedMessages();
          }}
          onViewFiles={() => {
            modalsDispatch({ type: "closeChannelInfo" });
          }}
          onEditTopic={() => {
            modalsDispatch({ type: "closeChannelInfo" });
            Alert.prompt(
              "Edit Topic",
              "Set a topic for this channel",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Save",
                  onPress: (text?: string) => {
                    void handleSaveTopic(text?.trim() || null);
                  },
                },
              ],
              "plain-text",
              channel?.description ?? "",
            );
          }}
          onLeaveChannel={() => {
            modalsDispatch({ type: "closeChannelInfo" });
            handleLeaveChannel();
          }}
          onArchiveChannel={isAdmin ? () => {
            modalsDispatch({ type: "closeChannelInfo" });
            handleArchiveChannel();
          } : undefined}
          onClose={() => modalsDispatch({ type: "closeChannelInfo" })}
        />
      )}
      {modalsState.reactionDetails && (
        <ReactionDetailsSheet
          visible
          emoji={modalsState.reactionDetails.emoji}
          userIds={modalsState.reactionDetails.userIds}
          members={members as { id: import("@openslaq/shared").UserId; displayName: string }[]}
          onClose={() => modalsDispatch({ type: "closeReactionDetails" })}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    flexSurface: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    centerFlex: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitleTouchable: {
      justifyContent: "center",
    },
    headerTitlePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    headerTitleText: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    archivedBanner: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surfaceSecondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderDefault,
      alignItems: "center",
    },
    archivedText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
  });
