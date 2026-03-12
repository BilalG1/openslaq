import { useCallback, useMemo } from "react";
import { MessageItem } from "../message/MessageItem";
import { MessageActionsProvider } from "../message/MessageActionsContext";
import { useAllUnreads } from "../../hooks/chat/useAllUnreads";
import type { UnreadChannelGroup } from "@openslaq/shared";

interface AllUnreadsViewProps {
  workspaceSlug: string;
  currentUserId: string;
  onNavigateToChannel: (channelId: string, messageId?: string) => void;
  onOpenThread: (messageId: string) => void;
  onOpenProfile: (userId: string) => void;
}

export function AllUnreadsView({
  workspaceSlug,
  currentUserId,
  onNavigateToChannel,
  onOpenThread,
  onOpenProfile,
}: AllUnreadsViewProps) {
  const { data, loading, error, markChannelRead, markAllRead } = useAllUnreads(workspaceSlug);

  const handleMessageClick = useCallback(
    (channelId: string, messageId: string) => {
      onNavigateToChannel(channelId, messageId);
    },
    [onNavigateToChannel],
  );

  const hasUnreads = data && (data.channels.length > 0 || data.threadMentions.length > 0);

  const actionsContextValue = useMemo(
    () => ({
      currentUserId,
      onOpenThread,
      onOpenProfile,
    }),
    [currentUserId, onOpenThread, onOpenProfile],
  );

  return (
    <MessageActionsProvider value={actionsContextValue}>
      <div className="flex flex-col h-full" data-testid="all-unreads-view">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <h2 className="text-lg font-bold text-primary">All Unreads</h2>
          {hasUnreads && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-[13px] text-link hover:underline bg-transparent border-none cursor-pointer"
              data-testid="mark-all-read-btn"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !data && (
            <div className="flex items-center justify-center py-12 text-faint">
              Loading unreads...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12 text-danger-text">
              {error}
            </div>
          )}

          {data && !hasUnreads && (
            <div className="flex flex-col items-center justify-center py-16 text-faint" data-testid="unreads-empty-state">
              <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-lg font-medium">You're all caught up!</span>
              <span className="text-sm mt-1">No unread messages</span>
            </div>
          )}

          {data?.channels.map((group) => (
            <ChannelGroup
              key={group.channelId}
              group={group}
              onMarkAsRead={() => void markChannelRead(group.channelId)}
              onMessageClick={(messageId) => handleMessageClick(group.channelId, messageId)}
            />
          ))}

          {data && data.threadMentions.length > 0 && (
            <div data-testid="thread-mentions-section">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-raised">
                <span className="text-[13px] font-semibold text-secondary">Threads</span>
              </div>
              <div className="px-4 py-2">
                {data.threadMentions.map((msg) => (
                  <div
                    key={msg.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (msg.parentMessageId) {
                        onNavigateToChannel(msg.channelId, msg.parentMessageId);
                        onOpenThread(msg.parentMessageId);
                      }
                    }}
                    data-testid={`thread-mention-${msg.id}`}
                  >
                    <MessageItem message={msg} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MessageActionsProvider>
  );
}

function ChannelGroup({
  group,
  onMarkAsRead,
  onMessageClick,
}: {
  group: UnreadChannelGroup;
  onMarkAsRead: () => void;
  onMessageClick: (messageId: string) => void;
}) {
  const channelPrefix = group.channelType === "dm" ? "" : "# ";
  return (
    <div data-testid={`unread-group-${group.channelId}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-raised">
        <span className="text-[13px] font-semibold text-secondary">
          {channelPrefix}{group.channelName}
        </span>
        <button
          type="button"
          onClick={onMarkAsRead}
          className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
          data-testid={`mark-read-${group.channelId}`}
        >
          Mark as read
        </button>
      </div>
      <div className="px-4 py-2">
        {group.messages.map((msg) => (
          <div
            key={msg.id}
            className="cursor-pointer"
            onClick={() => onMessageClick(msg.id)}
            data-testid={`unread-message-${msg.id}`}
          >
            <MessageItem message={msg} />
          </div>
        ))}
      </div>
    </div>
  );
}
