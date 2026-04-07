import type { HuddleState } from "@openslaq/shared";
import { Headphones } from "lucide-react";
import { Button, Tooltip } from "../ui";
import { useConfirm } from "../ui/confirm-dialog";
import { useAlert } from "../ui/confirm-dialog";

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
  const { confirm, dialog } = useConfirm();
  const { alert, alertDialog } = useAlert();
  const isInThisHuddle = currentHuddleChannelId === channelId;
  const isInAnotherHuddle = Boolean(currentHuddleChannelId) && currentHuddleChannelId !== channelId;

  const showAlreadyInHuddle = () => {
    alert({
      title: "Already in a huddle",
      description: "You must leave your current huddle before joining or starting another one.",
    });
  };

  const handleStart = async () => {
    if (isInAnotherHuddle) {
      showAlreadyInHuddle();
      return;
    }
    const ok = await confirm({
      title: "Start a huddle?",
      description: "This will start a live audio huddle in this channel.",
      confirmLabel: "Start",
    });
    if (ok) onStart();
  };

  const handleJoin = () => {
    if (isInAnotherHuddle) {
      showAlreadyInHuddle();
      return;
    }
    onJoin();
  };

  if (isInThisHuddle) {
    return (
      <>
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-green-400 text-sm"
          data-testid="huddle-in-progress"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          In huddle
        </span>
        {dialog}
        {alertDialog}
      </>
    );
  }

  if (activeHuddle) {
    return (
      <>
        <Button
          type="button"
          onClick={handleJoin}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-green-400 hover:text-green-300"
          data-testid="huddle-join-button"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Join ({activeHuddle.participants.length})
        </Button>
        {dialog}
        {alertDialog}
      </>
    );
  }

  return (
    <>
      <Tooltip content="Start a huddle">
        <button
          type="button"
          onClick={handleStart}
          data-testid="huddle-start-button"
          className="w-8 h-8 flex items-center justify-center rounded-md border border-border-default text-muted hover:bg-surface-tertiary hover:border-border-strong hover:text-primary transition-all cursor-pointer bg-transparent"
        >
          <Headphones className="w-[18px] h-[18px]" />
        </button>
      </Tooltip>
      {dialog}
      {alertDialog}
    </>
  );
}
