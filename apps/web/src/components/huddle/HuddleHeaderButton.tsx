import type { HuddleState } from "@openslaq/shared";
import { Headphones } from "lucide-react";
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
      <button
        type="button"
        onClick={onStart}
        data-testid="huddle-start-button"
        className="w-8 h-8 flex items-center justify-center rounded-md border border-border-default text-muted hover:bg-surface-tertiary hover:border-border-strong hover:text-primary transition-all cursor-pointer bg-transparent"
      >
        <Headphones className="w-[18px] h-[18px]" />
      </button>
    </Tooltip>
  );
}
