import type { HuddleState } from "@openslaq/shared";
import { HuddleHeaderButton } from "../huddle/HuddleHeaderButton";

interface DmHeaderProps {
  otherUserName?: string;
  isSelf?: boolean;
  groupDmName?: string;
  memberCount?: number;
  channelId?: string;
  activeHuddle?: HuddleState | null;
  currentHuddleChannelId?: string | null;
  onStartHuddle?: () => void;
  onJoinHuddle?: () => void;
}

export function DmHeader({
  otherUserName,
  isSelf,
  groupDmName,
  memberCount,
  channelId,
  activeHuddle,
  currentHuddleChannelId,
  onStartHuddle,
  onJoinHuddle,
}: DmHeaderProps) {
  const isGroupDm = Boolean(groupDmName);
  const title = isGroupDm
    ? groupDmName
    : isSelf
      ? `${otherUserName} (notes)`
      : otherUserName;

  return (
    <div className="px-4 py-3 border-b border-border-default min-h-[52px] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-lg m-0 text-primary">{title}</h2>
        {isGroupDm && memberCount !== undefined && (
          <span className="text-sm text-secondary" data-testid="group-dm-member-count">
            {memberCount} members
          </span>
        )}
      </div>
      {channelId && onStartHuddle && onJoinHuddle && (
        <HuddleHeaderButton
          channelId={channelId}
          activeHuddle={activeHuddle ?? null}
          currentHuddleChannelId={currentHuddleChannelId ?? null}
          onStart={onStartHuddle}
          onJoin={onJoinHuddle}
        />
      )}
    </div>
  );
}
