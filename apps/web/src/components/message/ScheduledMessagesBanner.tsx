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
        <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
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
