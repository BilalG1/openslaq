import { CheckCircle, ExternalLink } from "lucide-react";
import { useScheduledMessages } from "../../hooks/chat/useScheduledMessages";
import { EmptyState, LoadingState, ErrorState } from "../ui";
import type { ScheduledMessageItem } from "@openslaq/client-core";

interface SentTabProps {
  workspaceSlug: string;
  onNavigateToChannel: (channelId: string, messageId?: string) => void;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupByDate(
  items: (ScheduledMessageItem & { channelName: string })[],
): Map<string, (ScheduledMessageItem & { channelName: string })[]> {
  const groups = new Map<string, (ScheduledMessageItem & { channelName: string })[]>();
  for (const item of items) {
    const label = getDateLabel(item.updatedAt);
    const group = groups.get(label);
    if (group) {
      group.push(item);
    } else {
      groups.set(label, [item]);
    }
  }
  return groups;
}

function truncate(text: string, maxLen: number): string {
  const flat = text.replace(/\n/g, " ");
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen).trimEnd()}...`;
}

export function SentTab({ workspaceSlug, onNavigateToChannel }: SentTabProps) {
  const { data, loading, error } = useScheduledMessages(workspaceSlug);

  const items = data?.filter((item) => item.status === "sent") ?? null;

  if (loading && !data) {
    return <LoadingState label="Loading sent messages..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (items && items.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle className="w-full h-full" strokeWidth={1.5} />}
        title="No sent messages"
        subtitle="Scheduled messages that have been sent will appear here"
        data-testid="sent-empty-state"
      />
    );
  }

  const grouped = items ? groupByDate(items) : new Map();

  return (
    <div data-testid="sent-list">
      {[...grouped.entries()].map(([dateLabel, groupItems]: [string, typeof items & object], groupIdx: number) => (
        <div key={dateLabel}>
          {groupIdx > 0 && <hr className="border-border-default mx-4" />}
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-[12px] font-semibold text-secondary uppercase tracking-wide">
              {dateLabel}
            </h3>
          </div>
          {groupItems.map((item) => {
            const time = new Date(item.updatedAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-surface-raised transition-colors"
                data-testid={`sent-message-${item.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-secondary shrink-0">
                      #{item.channelName}
                    </span>
                    <span className="text-[13px] text-faint truncate">
                      {truncate(item.content, 80)}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-faint shrink-0">{time}</span>
                {item.sentMessageId && (
                  <button
                    type="button"
                    onClick={() => onNavigateToChannel(item.channelId, item.sentMessageId!)}
                    className="p-1 rounded hover:bg-surface-tertiary bg-transparent border-none cursor-pointer"
                    data-testid={`view-sent-${item.id}`}
                    aria-label="View message"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-secondary" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
