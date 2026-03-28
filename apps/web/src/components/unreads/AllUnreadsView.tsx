import { useCallback, useMemo } from "react";
import { CircleCheck } from "lucide-react";
import { MessageItem } from "../message/MessageItem";
import { MessageActionsProvider } from "../message/MessageActionsContext";
import { EmptyState, LoadingState, ErrorState } from "../ui";
import { useAllUnreads } from "../../hooks/chat/useAllUnreads";
import { useChatStore } from "../../state/chat-store";
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
  const { state } = useChatStore();

  const dmNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const dm of state.dms) {
      map.set(dm.channel.id, dm.otherUser.displayName);
    }
    return map;
  }, [state.dms]);

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
            <LoadingState label="Loading unreads..." />
          )}

          {error && (
            <ErrorState message={error} />
          )}

          {data && !hasUnreads && (
            <EmptyState
              icon={<CircleCheck className="w-full h-full" strokeWidth={1.5} />}
              title="You're all caught up!"
              subtitle="No unread messages"
              data-testid="unreads-empty-state"
            />
          )}

          {data?.channels.map((group) => (
            <ChannelGroup
              key={group.channelId}
              group={group}
              dmNameMap={dmNameMap}
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
  dmNameMap,
  onMarkAsRead,
  onMessageClick,
}: {
  group: UnreadChannelGroup;
  dmNameMap: Map<string, string>;
  onMarkAsRead: () => void;
  onMessageClick: (messageId: string) => void;
}) {
  const isDm = group.channelType === "dm";
  const channelPrefix = isDm ? "" : "# ";
  const displayName = isDm ? (dmNameMap.get(group.channelId) ?? group.channelName) : group.channelName;
  return (
    <div data-testid={`unread-group-${group.channelId}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-raised">
        <span className="text-[13px] font-semibold text-secondary">
          {channelPrefix}{displayName}
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
