import { useCallback, useMemo } from "react";
import { Bookmark } from "lucide-react";
import { MessageItem } from "../message/MessageItem";
import { MessageActionsProvider } from "../message/MessageActionsContext";
import { EmptyState, LoadingState, ErrorState } from "../ui";
import { useSavedMessages } from "../../hooks/chat/useSavedMessages";
import type { SavedMessageItem } from "@openslaq/client-core";

interface SavedItemsViewProps {
  workspaceSlug: string;
  currentUserId: string;
  onNavigateToChannel: (channelId: string, messageId?: string) => void;
  onOpenThread: (messageId: string) => void;
  onOpenProfile: (userId: string) => void;
  onUnsaveMessage: (messageId: string, channelId: string) => void;
}

export function SavedItemsView({
  workspaceSlug,
  currentUserId,
  onNavigateToChannel,
  onOpenThread,
  onOpenProfile,
  onUnsaveMessage,
}: SavedItemsViewProps) {
  const { data, loading, error, removeItem } = useSavedMessages(workspaceSlug);

  const handleMessageClick = useCallback(
    (channelId: string, messageId: string) => {
      onNavigateToChannel(channelId, messageId);
    },
    [onNavigateToChannel],
  );

  const handleUnsave = useCallback(
    (item: SavedMessageItem) => {
      onUnsaveMessage(item.message.id, item.message.channelId);
      removeItem(item.message.id);
    },
    [onUnsaveMessage, removeItem],
  );

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
      <div className="flex flex-col h-full" data-testid="saved-items-view">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <h2 className="text-lg font-bold text-primary">Saved Items</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !data && (
            <LoadingState label="Loading saved messages..." />
          )}

          {error && (
            <ErrorState message={error} />
          )}

          {data && data.length === 0 && (
            <EmptyState
              icon={<Bookmark className="w-full h-full" strokeWidth={1.5} />}
              title="No saved messages"
              subtitle="Save messages for quick reference later"
              data-testid="saved-empty-state"
            />
          )}

          {data?.map((item) => (
            <SavedMessageGroup
              key={item.message.id}
              item={item}
              onMessageClick={(messageId) => handleMessageClick(item.message.channelId, messageId)}
              onUnsave={() => handleUnsave(item)}
            />
          ))}
        </div>
      </div>
    </MessageActionsProvider>
  );
}

function SavedMessageGroup({
  item,
  onMessageClick,
  onUnsave,
}: {
  item: SavedMessageItem;
  onMessageClick: (messageId: string) => void;
  onUnsave: () => void;
}) {
  return (
    <div data-testid={`saved-message-${item.message.id}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-raised">
        <span className="text-[13px] font-semibold text-secondary">
          # {item.channelName}
        </span>
        <button
          type="button"
          onClick={onUnsave}
          className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
          data-testid={`unsave-${item.message.id}`}
        >
          Remove
        </button>
      </div>
      <div className="px-4 py-2">
        <div
          className="cursor-pointer"
          onClick={() => onMessageClick(item.message.id)}
        >
          <MessageItem message={item.message} />
        </div>
      </div>
    </div>
  );
}
