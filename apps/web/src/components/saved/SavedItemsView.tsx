import { useCallback } from "react";
import { MessageItem } from "../message/MessageItem";
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

  return (
    <div className="flex flex-col h-full" data-testid="saved-items-view">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <h2 className="text-lg font-bold text-primary">Saved Items</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && !data && (
          <div className="flex items-center justify-center py-12 text-faint">
            Loading saved messages...
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-danger-text">
            {error}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-faint" data-testid="saved-empty-state">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            <span className="text-lg font-medium">No saved messages</span>
            <span className="text-sm mt-1">Save messages for quick reference later</span>
          </div>
        )}

        {data?.map((item) => (
          <SavedMessageGroup
            key={item.message.id}
            item={item}
            currentUserId={currentUserId}
            onMessageClick={(messageId) => handleMessageClick(item.message.channelId, messageId)}
            onOpenThread={onOpenThread}
            onOpenProfile={onOpenProfile}
            onUnsave={() => handleUnsave(item)}
          />
        ))}
      </div>
    </div>
  );
}

function SavedMessageGroup({
  item,
  currentUserId,
  onMessageClick,
  onOpenThread,
  onOpenProfile,
  onUnsave,
}: {
  item: SavedMessageItem;
  currentUserId: string;
  onMessageClick: (messageId: string) => void;
  onOpenThread: (messageId: string) => void;
  onOpenProfile: (userId: string) => void;
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
          <MessageItem
            message={item.message}
            currentUserId={currentUserId}
            onOpenThread={onOpenThread}
            onOpenProfile={onOpenProfile}
          />
        </div>
      </div>
    </div>
  );
}
