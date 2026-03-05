import clsx from "clsx";
import { Plus } from "lucide-react";
import type { HuddleState } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation, PresenceEntry } from "../../state/chat-store";
import { Badge, Tooltip } from "../ui";
import { HuddleIndicator } from "../channel/HuddleIndicator";

interface DmListProps {
  activeDmId: string | null;
  activeGroupDmId: string | null;
  onSelectDm: (channelId: string) => void;
  onSelectGroupDm: (channelId: string) => void;
  dms: DmConversation[];
  groupDms: GroupDmConversation[];
  currentUserId: string;
  onNewDm: () => void;
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeHuddles?: Record<string, HuddleState>;
}

export function DmList({
  activeDmId,
  activeGroupDmId,
  onSelectDm,
  onSelectGroupDm,
  dms,
  groupDms,
  currentUserId,
  onNewDm,
  unreadCounts,
  presence,
  collapsed,
  onToggleCollapsed,
  activeHuddles,
}: DmListProps) {
  return (
    <div className="py-2">
      <button
        type="button"
        data-testid="dms-section-header"
        onClick={onToggleCollapsed}
        className="group w-full px-4 py-1 text-[13px] text-gray-400 font-semibold flex items-center justify-between hover:bg-white/10 rounded-sm bg-transparent border-none cursor-pointer text-left"
      >
        <span className="flex items-center gap-1">
          {/* Speech bubble icon (default) */}
          <svg
            className="w-3 h-3 group-hover:hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {/* Chevron (on hover) */}
          <svg
            className={clsx("w-3 h-3 hidden group-hover:block transition-transform", collapsed && "-rotate-90")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Direct Messages
        </span>
        <Tooltip content="New direct message">
          <span
            role="button"
            data-testid="new-dm-button"
            onClick={(e) => { e.stopPropagation(); onNewDm(); }}
            className="opacity-0 group-hover:opacity-100 px-1 leading-none hover:text-white"
          >
            <Plus className="w-4 h-4" />
          </span>
        </Tooltip>
      </button>
      {!collapsed && (
        <>
          {/* 1:1 DMs */}
          {dms.map(({ channel, otherUser }) => {
            const isSelf = otherUser.id === currentUserId;
            const label = isSelf ? `${otherUser.displayName} (you)` : otherUser.displayName;
            const unread = unreadCounts[channel.id] ?? 0;
            const userPresence = presence[otherUser.id];
            const online = userPresence?.online ?? false;
            const statusEmoji = userPresence?.statusEmoji && userPresence.statusExpiresAt
              ? (new Date(userPresence.statusExpiresAt).getTime() > Date.now() ? userPresence.statusEmoji : null)
              : userPresence?.statusEmoji ?? null;
            const huddle = activeHuddles?.[channel.id];
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onSelectDm(channel.id)}
                className={clsx(
                  "flex w-full items-center justify-between py-1 pl-6 pr-4 border-none text-white text-left cursor-pointer text-sm",
                  activeDmId === channel.id
                    ? "bg-white/15"
                    : "bg-transparent hover:bg-white/10",
                )}
              >
                <span className={clsx("flex items-center gap-2", unread > 0 && "font-bold")}>
                  <span
                    data-testid={`presence-${otherUser.id}`}
                    className={clsx(
                      "w-2 h-2 rounded-full shrink-0",
                      online ? "bg-green-500" : "bg-gray-500",
                    )}
                  />
                  {label}
                  {statusEmoji && (
                    <span className="text-xs" data-testid={`status-emoji-${otherUser.id}`}>{statusEmoji}</span>
                  )}
                  {huddle && (
                    <HuddleIndicator channelId={channel.id} participantCount={huddle.participants.length} />
                  )}
                </span>
                {unread > 0 && (
                  <Badge
                    variant="red"
                    size="sm"
                    data-testid={`unread-badge-${channel.id}`}
                  >
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })}

          {/* Group DMs */}
          {groupDms.map(({ channel, members }) => {
            const label = channel.displayName ?? members.map((m) => m.displayName).join(", ");
            const unread = unreadCounts[channel.id] ?? 0;
            const huddle = activeHuddles?.[channel.id];
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onSelectGroupDm(channel.id)}
                data-testid={`group-dm-${channel.id}`}
                className={clsx(
                  "flex w-full items-center justify-between py-1 pl-6 pr-4 border-none text-white text-left cursor-pointer text-sm",
                  activeGroupDmId === channel.id
                    ? "bg-white/15"
                    : "bg-transparent hover:bg-white/10",
                )}
              >
                <span className={clsx("flex items-center gap-2", unread > 0 && "font-bold")}>
                  {/* Group icon */}
                  <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="truncate">{label}</span>
                  {huddle && (
                    <HuddleIndicator channelId={channel.id} participantCount={huddle.participants.length} />
                  )}
                </span>
                {unread > 0 && (
                  <Badge
                    variant="red"
                    size="sm"
                    data-testid={`unread-badge-${channel.id}`}
                  >
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
