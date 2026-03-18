import type { HuddleMessage, HuddleState } from "@openslaq/shared";

interface HuddleSystemMessageProps {
  message: HuddleMessage;
  activeHuddle?: HuddleState | null;
  onJoinHuddle?: (channelId: string) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

export function HuddleSystemMessage({ message, activeHuddle, onJoinHuddle }: HuddleSystemMessageProps) {
  const meta = message.metadata;
  const isActive = Boolean(activeHuddle);
  const senderName = message.senderDisplayName ?? message.userId;

  return (
    <div className="flex items-center gap-3 py-2 px-4 -mx-4 my-1 rounded-lg bg-surface-raised" data-testid="huddle-system-message">
      {/* Headphone icon */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-green-500/20" : "bg-gray-500/20"}`}>
        <svg className={`w-4 h-4 ${isActive ? "text-green-400" : "text-faint"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072M17.657 6.343a8 8 0 010 11.314M6.343 6.343a8 8 0 000 11.314" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-sm ${isActive ? "text-primary" : "text-faint"}`}>
          <span className="font-semibold">{senderName}</span>
          {" started a huddle"}
        </div>

        {isActive && activeHuddle ? (
          <div className="flex items-center gap-2 mt-1">
            {/* Live participant avatars */}
            <div className="flex -space-x-1">
              {activeHuddle.participants.map((p) => (
                <div
                  key={p.userId}
                  className="w-5 h-5 rounded-full bg-gray-600 border-2 border-surface-raised flex items-center justify-center text-[9px] text-gray-300"
                  title={p.userId}
                >
                  {p.userId.slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-faint">
              {activeHuddle.participants.length} participant{activeHuddle.participants.length !== 1 ? "s" : ""}
            </span>
            {/* Pulsing indicator */}
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        ) : meta?.huddleEndedAt ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-faint">
              Lasted {meta.duration != null ? formatDuration(meta.duration) : "a moment"}
            </span>
            {meta.finalParticipants && meta.finalParticipants.length > 0 && (
              <div className="flex -space-x-1">
                {meta.finalParticipants.map((userId) => (
                  <div
                    key={userId}
                    className="w-5 h-5 rounded-full bg-gray-600 border-2 border-surface-raised flex items-center justify-center text-[9px] text-gray-300"
                    title={userId}
                  >
                    {userId.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Join button for active huddles */}
      {isActive && onJoinHuddle && (
        <button
          type="button"
          onClick={() => onJoinHuddle(message.channelId)}
          className="shrink-0 px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md border-none cursor-pointer"
          data-testid="huddle-join-from-message"
        >
          Join
        </button>
      )}
    </div>
  );
}
