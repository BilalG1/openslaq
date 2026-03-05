import { Fragment, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSocketEvent } from "../../hooks/useSocketEvent";
import { MessageItem } from "./MessageItem";
import { MessageInput } from "./MessageInput";
import { DaySeparator } from "./DaySeparator";
import { isDifferentDay } from "./message-date-utils";
import type { Message, MessageId, ChannelId, ReactionGroup } from "@openslaq/shared";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useThreadMessages } from "../../hooks/chat/useThreadMessages";
import { useMessageMutations } from "../../hooks/chat/useMessageMutations";
import { useLoadMoreReplies } from "../../hooks/chat/useLoadMoreReplies";
import { useScrollAnchor } from "../../hooks/chat/useScrollAnchor";
import { useBotActions } from "../../hooks/chat/useBotActions";
import { useTypingEmitter } from "../../hooks/chat/useTypingEmitter";
import { useChatStore } from "../../state/chat-store";

interface ThreadPanelProps {
  channelId: string;
  parentMessageId: string;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
  style?: React.CSSProperties;
}

export function ThreadPanel({ channelId, parentMessageId, onClose, onOpenProfile, style }: ThreadPanelProps) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state, dispatch } = useChatStore();
  const { toggleReaction, editMessage, deleteMessage } = useMessageMutations(user);
  const { triggerAction } = useBotActions();
  const { emitTyping } = useTypingEmitter(channelId);

  useThreadMessages(workspaceSlug, channelId, parentMessageId);

  const { loadOlder, loadingOlder, hasOlder } = useLoadMoreReplies(channelId, parentMessageId);

  const parentMessage = state.messagesById[parentMessageId] ?? null;
  const replies = (state.threadReplyIds[parentMessageId] ?? [])
    .map((id) => state.messagesById[id])
    .filter((msg): msg is Message => Boolean(msg));

  const loading = state.ui.threadLoading[parentMessageId] ?? false;
  const error = state.ui.threadError[parentMessageId];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  useScrollAnchor({
    scrollContainerRef,
    topSentinelRef,
    items: replies,
    currentUserId: user?.id,
    contextId: parentMessageId,
    loadingOlder,
    hasOlder,
    loadOlder,
  });

  const handleNewMessage = useCallback(
    (message: Message) => {
      if (message.parentMessageId === parentMessageId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [dispatch, parentMessageId],
  );

  const handleReactionUpdated = useCallback(
    (payload: {
      messageId: MessageId;
      channelId: ChannelId;
      reactions: ReactionGroup[];
    }) => {
      if (payload.channelId !== channelId) return;
      dispatch({
        type: "messages/updateReactions",
        messageId: payload.messageId,
        reactions: payload.reactions,
      });
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
      if (payload.channelId !== channelId) return;

      dispatch({ type: "messages/delete", messageId: payload.id, channelId: payload.channelId });
      if (payload.id === parentMessageId) {
        onClose();
      }
    },
    [channelId, dispatch, onClose, parentMessageId],
  );

  useSocketEvent("message:new", handleNewMessage);
  useSocketEvent("message:updated", handleMessageUpdated);
  useSocketEvent("message:deleted", handleMessageDeleted);
  useSocketEvent("reaction:updated", handleReactionUpdated);

  return (
    <div
      data-testid="thread-panel"
      className="shrink-0 border-l border-border-default flex flex-col h-full bg-surface"
      style={style}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default font-semibold text-[15px] text-primary">
        <span>Thread</span>
        <button
          data-testid="thread-close"
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-lg text-muted px-1"
        >
          ✕
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-faint text-[13px] text-center p-4">
            Loading thread...
          </div>
        ) : error ? (
          <div className="text-danger-text text-[13px] text-center p-4">
            {error}
          </div>
        ) : (
          <>
            {parentMessage && (
              <div className="pb-3 border-b border-border-secondary mb-3">
                <MessageItem
                  message={parentMessage}
                  currentUserId={user?.id}
                  onToggleReaction={toggleReaction}
                  onOpenProfile={onOpenProfile}
                  onEditMessage={editMessage}
                  onDeleteMessage={deleteMessage}
                  onBotAction={triggerAction}
                  customEmojis={state.customEmojis}
                />
              </div>
            )}

            <div ref={topSentinelRef} className="h-px" />
            {loadingOlder && (
              <div data-testid="loading-more-replies" className="text-center text-faint text-xs py-2">
                Loading more replies...
              </div>
            )}

            {replies.length === 0 ? (
              <div className="text-faint text-[13px] text-center p-4">
                No replies yet
              </div>
            ) : (
              replies.map((reply, index) => {
                const prevCreatedAt =
                  index === 0
                    ? parentMessage?.createdAt
                    : replies[index - 1]!.createdAt;
                const showSeparator =
                  prevCreatedAt != null && isDifferentDay(prevCreatedAt, reply.createdAt);
                const prevReply = index > 0 ? replies[index - 1] : null;
                const prevUserId = prevReply ? prevReply.userId : parentMessage?.userId;
                const isGrouped =
                  !showSeparator &&
                  prevUserId != null &&
                  reply.userId === prevUserId &&
                  prevCreatedAt != null &&
                  new Date(reply.createdAt).getTime() - new Date(prevCreatedAt).getTime() < 5 * 60 * 1000;
                return (
                  <Fragment key={reply.id}>
                    {showSeparator && <DaySeparator date={new Date(reply.createdAt)} />}
                    <MessageItem
                      message={reply}
                      currentUserId={user?.id}
                      isGrouped={isGrouped}
                      onToggleReaction={toggleReaction}
                      onOpenProfile={onOpenProfile}
                      onEditMessage={editMessage}
                      onDeleteMessage={deleteMessage}
                      onBotAction={triggerAction}
                      customEmojis={state.customEmojis}
                    />
                  </Fragment>
                );
              })
            )}
          </>
        )}
      </div>

      <MessageInput channelId={channelId} parentMessageId={parentMessageId} onTyping={emitTyping} />
    </div>
  );
}
