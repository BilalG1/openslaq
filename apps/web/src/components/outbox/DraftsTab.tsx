import { FileEdit, Pencil, Trash2 } from "lucide-react";
import { useDrafts } from "../../hooks/chat/useDrafts";
import { EmptyState, LoadingState, ErrorState } from "../ui";

interface DraftsTabProps {
  workspaceSlug: string;
  onNavigateToChannel: (channelId: string) => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DraftsTab({ workspaceSlug, onNavigateToChannel }: DraftsTabProps) {
  const { data, loading, error, removeItem } = useDrafts(workspaceSlug);

  if (loading && !data) {
    return <LoadingState label="Loading drafts..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (data && data.length === 0) {
    return (
      <EmptyState
        icon={<FileEdit className="w-full h-full" strokeWidth={1.5} />}
        title="No drafts"
        subtitle="Drafts appear here as you type"
        data-testid="drafts-empty-state"
      />
    );
  }

  return (
    <div data-testid="drafts-list" className="p-4 space-y-3">
      {data?.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-border-default shadow-sm bg-surface-default"
          data-testid={`draft-${item.id}`}
        >
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-slaq-blue/10 text-slaq-blue px-2.5 py-0.5 text-[12px] font-medium">
                #{item.channelName}
                {item.parentMessageId && (
                  <span className="ml-1 opacity-70">(thread)</span>
                )}
              </span>
              <span className="text-[12px] text-faint">
                {relativeTime(item.updatedAt)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigateToChannel(item.channelId)}
                className="p-1.5 rounded hover:bg-surface-hover text-secondary hover:text-primary bg-transparent border-none cursor-pointer"
                data-testid={`edit-draft-${item.id}`}
                title="Edit draft"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="p-1.5 rounded hover:bg-danger-bg text-secondary hover:text-danger-text bg-transparent border-none cursor-pointer"
                data-testid={`delete-draft-${item.id}`}
                title="Delete draft"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="px-4 pb-4 pt-1">
            <p className="text-sm text-primary whitespace-pre-wrap line-clamp-3">
              {item.content || <span className="text-faint italic">Empty draft</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
