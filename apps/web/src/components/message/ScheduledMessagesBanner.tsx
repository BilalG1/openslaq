import { Clock } from "lucide-react";
import { useScheduledCountForChannel } from "../../hooks/chat/useScheduledMessages";

interface ScheduledMessagesBannerProps {
  channelId: string;
  workspaceSlug: string;
  onViewScheduled: () => void;
}

export function ScheduledMessagesBanner({
  channelId,
  workspaceSlug,
  onViewScheduled,
}: ScheduledMessagesBannerProps) {
  const { count } = useScheduledCountForChannel(channelId, workspaceSlug);

  if (count === 0) return null;

  return (
    <div
      className="mx-4 mb-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm flex items-center justify-between"
      data-testid="scheduled-messages-banner"
    >
      <span className="text-blue-700 dark:text-blue-300">
        <Clock className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
        You have {count} scheduled message{count !== 1 ? "s" : ""}
      </span>
      <button
        type="button"
        onClick={onViewScheduled}
        className="text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer text-sm font-medium"
        data-testid="view-scheduled-link"
      >
        View
      </button>
    </div>
  );
}
