import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { useSocketEvent } from "../../hooks/useSocketEvent";
import { MessageItem } from "./MessageItem";
import { MessageActionsProvider } from "./MessageActionsContext";
import { HuddleSystemMessage } from "./HuddleSystemMessage";
import { ChannelEventSystemMessage } from "./ChannelEventSystemMessage";
import { DaySeparator } from "./DaySeparator";
import { isDifferentDay } from "./message-date-utils";
import { EmptyState, LoadingState, ErrorState } from "../ui";
import type { Message, ChannelId, MessageId, UserId, ReactionGroup } from "@openslaq/shared";
import { asChannelId } from "@openslaq/shared";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useChannelMessages } from "../../hooks/chat/useChannelMessages";
import { useMessageMutations } from "../../hooks/chat/useMessageMutations";
import { useLoadOlderMessages } from "../../hooks/chat/useLoadOlderMessages";
import { useLoadNewerMessages } from "../../hooks/chat/useLoadNewerMessages";
import { useScrollAnchor } from "../../hooks/chat/useScrollAnchor";
import { useBotActions } from "../../hooks/chat/useBotActions";
import { EphemeralMessageItem } from "./EphemeralMessage";
import { useChatStore } from "../../state/chat-store";
import { useWorkspaceMembers } from "../../hooks/chat/useWorkspaceMembers";
import type { EphemeralMessage } from "@openslaq/shared";

interface MessageListProps {
  channelId: string;
  onOpenThread?: (messageId: string) => void;
  onOpenProfile?: (userId: string) => void;
  onJoinHuddle?: (channelId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onShareMessage?: (messageId: string) => void;
  onSaveMessage?: (messageId: string) => void;
  onUnsaveMessage?: (messageId: string) => void;
  savedMessageIds?: string[];
  ephemeralMessages?: EphemeralMessage[];
  onEphemeralMessage?: (msg: EphemeralMessage) => void;
}

export function MessageList({ channelId, onOpenThread, onOpenProfile, onJoinHuddle, onPinMessage, onUnpinMessage, onShareMessage, onSaveMessage, onUnsaveMessage, savedMessageIds, ephemeralMessages, onEphemeralMessage }: MessageListProps) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { joinChannel, status } = useSocket();
  const { state, dispatch } = useChatStore();
  const { toggleReaction, editMessage, deleteMessage, markAsUnread } = useMessageMutations(user);
  const { triggerAction } = useBotActions();
  const { workspaceMembers } = useWorkspaceMembers(workspaceSlug);

  useChannelMessages(workspaceSlug, channelId);

  const { loadOlder, loadingOlder, hasOlder } = useLoadOlderMessages(channelId);
  const { loadNewer, loadingNewer, hasNewer } = useLoadNewerMessages(channelId);

  const messages = (state.channelMessageIds[channelId] ?? [])
    .map((id) => state.messagesById[id])
    .filter((msg): msg is Message => Boolean(msg));

  const loading = state.ui.channelMessagesLoading[channelId] ?? false;
  const error = state.ui.channelMessagesError[channelId];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  useScrollAnchor({
    scrollContainerRef,
    topSentinelRef,
    bottomSentinelRef,
    items: messages,
    currentUserId: user?.id,
    contextId: channelId,
    loadingOlder,
    hasOlder,
    loadOlder,
    loadingNewer,
    hasNewer,
    loadNewer,
    enableScrollCache: true,
  });

  const handleNewMessage = useCallback(
    (message: Message) => {
      if (message.channelId === channelId && !message.parentMessageId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [channelId, dispatch],
  );

  const handleThreadUpdated = useCallback(
    (payload: {
      parentMessageId: MessageId;
      channelId: ChannelId;
      replyCount: number;
      latestReplyAt: string;
    }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updateThreadSummary",
          channelId: payload.channelId,
          parentMessageId: payload.parentMessageId,
          replyCount: payload.replyCount,
          latestReplyAt: payload.latestReplyAt,
        });
      }
    },
    [channelId, dispatch],
  );

  const handleReactionUpdated = useCallback(
    (payload: {
      messageId: MessageId;
      channelId: ChannelId;
      reactions: ReactionGroup[];
    }) => {
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

  const handleMessageUpdated = useCallback(
    (message: Message) => {
      if (message.channelId === channelId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [channelId, dispatch],
  );

  const handleMessageDeleted = useCallback(
    (payload: { id: MessageId; channelId: ChannelId }) => {
      if (payload.channelId === channelId) {
        dispatch({ type: "messages/delete", messageId: payload.id, channelId: payload.channelId });
      }
    },
    [channelId, dispatch],
  );

  const handleMessagePinned = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; pinnedBy: UserId; pinnedAt: string }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updatePinStatus",
          messageId: payload.messageId,
          isPinned: true,
          pinnedBy: payload.pinnedBy,
          pinnedAt: payload.pinnedAt,
        });
      }
    },
    [channelId, dispatch],
  );

  const handleMessageUnpinned = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updatePinStatus",
          messageId: payload.messageId,
          isPinned: false,
        });
      }
    },
    [channelId, dispatch],
  );

  useSocketEvent("message:new", handleNewMessage);
  useSocketEvent("message:updated", handleMessageUpdated);
  useSocketEvent("message:deleted", handleMessageDeleted);
  useSocketEvent("thread:updated", handleThreadUpdated);
  useSocketEvent("reaction:updated", handleReactionUpdated);
  useSocketEvent("message:pinned", handleMessagePinned);
  useSocketEvent("message:unpinned", handleMessageUnpinned);

  const handleCommandEphemeral = useCallback(
    (payload: EphemeralMessage) => {
      if (payload.channelId === channelId) {
        onEphemeralMessage?.(payload);
      }
    },
    [channelId, onEphemeralMessage],
  );
  useSocketEvent("command:ephemeral", handleCommandEphemeral);

  useEffect(() => {
    if (status === "connected") {
      joinChannel(asChannelId(channelId));
    }
  }, [channelId, joinChannel, status]);

  const actionsContextValue = useMemo(
    () => ({
      currentUserId: user?.id,
      onOpenThread,
      onToggleReaction: toggleReaction,
      onOpenProfile,
      onEditMessage: editMessage,
      onDeleteMessage: deleteMessage,
      onMarkAsUnread: markAsUnread,
      onPinMessage,
      onUnpinMessage,
      onShareMessage,
      onSaveMessage,
      onUnsaveMessage,
      onBotAction: triggerAction,
      savedMessageIds,
      customEmojis: state.customEmojis,
      workspaceMembers,
    }),
    [user?.id, onOpenThread, toggleReaction, onOpenProfile, editMessage, deleteMessage, markAsUnread, onPinMessage, onUnpinMessage, onShareMessage, onSaveMessage, onUnsaveMessage, triggerAction, savedMessageIds, state.customEmojis, workspaceMembers],
  );

  return (
    <MessageActionsProvider value={actionsContextValue}>
      <div ref={scrollContainerRef} data-testid="message-list-scroll" className="flex-1 overflow-y-auto p-4 pb-6 flex flex-col-reverse">
        {loading ? (
          <LoadingState label="Loading messages..." className="h-full" />
        ) : error ? (
          <ErrorState message={error} className="h-full" />
        ) : messages.length === 0 && !ephemeralMessages?.length ? (
          <EmptyState title="No messages yet. Start the conversation!" className="h-full" />
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-end h-full">
            {ephemeralMessages?.map((msg) => (
              <EphemeralMessageItem key={msg.id} message={msg} />
            ))}
          </div>
        ) : (
          <>
            <div ref={topSentinelRef} className="h-px" />
            {loadingNewer && (
              <div data-testid="loading-newer" className="text-center text-faint text-xs py-2">
                Loading newer messages...
              </div>
            )}
            {ephemeralMessages?.map((msg) => (
              <EphemeralMessageItem key={msg.id} message={msg} />
            ))}
            {[...messages].reverse().map((msg, revIndex) => {
              // revIndex 0 = newest message. Convert to original index for neighbor lookups.
              const index = messages.length - 1 - revIndex;
              const prevMsg = index > 0 ? messages[index - 1]! : null;
              const showSeparator =
                index === 0 || isDifferentDay(prevMsg!.createdAt, msg.createdAt);
              const isSystemMessage = msg.type === "huddle" || msg.type === "channel_event";
              const prevIsSystemMessage = prevMsg?.type === "huddle" || prevMsg?.type === "channel_event";
              const isGrouped =
                !showSeparator &&
                prevMsg !== null &&
                !prevIsSystemMessage &&
                !isSystemMessage &&
                msg.userId === prevMsg.userId &&
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000;

              return (
                <Fragment key={msg.id}>
                  {msg.type === "channel_event" ? (
                    <ChannelEventSystemMessage message={msg} />
                  ) : msg.type === "huddle" ? (
                    <HuddleSystemMessage
                      message={msg}
                      activeHuddle={state.activeHuddles[msg.channelId] ?? null}
                      currentUserId={user?.id}
                      onJoinHuddle={onJoinHuddle}
                    />
                  ) : (
                    <MessageItem
                      message={msg}
                      isGrouped={isGrouped}
                      senderStatusEmoji={(() => {
                        const p = state.presence[msg.userId];
                        if (!p?.statusEmoji) return null;
                        if (p.statusExpiresAt && new Date(p.statusExpiresAt).getTime() <= Date.now()) return null;
                        return p.statusEmoji;
                      })()}
                    />
                  )}
                  {showSeparator && <DaySeparator date={new Date(msg.createdAt)} />}
                </Fragment>
              );
            })}
            {loadingOlder && (
              <div data-testid="loading-older" className="text-center text-faint text-xs py-2">
                Loading older messages...
              </div>
            )}
            <div ref={bottomSentinelRef} className="h-px" />
          </>
        )}
      </div>
    </MessageActionsProvider>
  );
}
