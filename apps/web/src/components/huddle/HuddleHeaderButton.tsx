import type { HuddleState } from "@openslaq/shared";
import { Button, Tooltip } from "../ui";

interface HuddleHeaderButtonProps {
  channelId: string;
  activeHuddle: HuddleState | null;
  currentHuddleChannelId: string | null;
  onStart: () => void;
  onJoin: () => void;
}

export function HuddleHeaderButton({
  channelId,
  activeHuddle,
  currentHuddleChannelId,
  onStart,
  onJoin,
}: HuddleHeaderButtonProps) {
  const isInThisHuddle = currentHuddleChannelId === channelId;

  if (isInThisHuddle) {
    return (
      <span
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-green-400 text-sm"
        data-testid="huddle-in-progress"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        In huddle
      </span>
    );
  }

  if (activeHuddle) {
    return (
      <Button
        type="button"
        onClick={onJoin}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-green-400 hover:text-green-300"
        data-testid="huddle-join-button"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Join ({activeHuddle.participants.length})
      </Button>
    );
  }

  return (
    <Tooltip content="Start a huddle">
      <Button
        type="button"
        onClick={onStart}
        variant="ghost"
        size="sm"
        className="px-1.5"
        data-testid="huddle-start-button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072" />
        </svg>
      </Button>
    </Tooltip>
  );
}
