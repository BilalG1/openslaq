import { useState, useCallback, type MouseEvent } from "react";
import clsx from "clsx";
import type { Channel, HuddleState, ChannelNotifyLevel } from "@openslaq/shared";
import type { DmConversation, PresenceEntry } from "../../state/chat-store";
import { Badge } from "../ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";

interface StarredListProps {
  starredChannels: Channel[];
  starredDms: DmConversation[];
  activeChannelId: string | null;
  activeDmId: string | null;
  onSelectChannel: (id: string) => void;
  onSelectDm: (channelId: string) => void;
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  activeHuddles?: Record<string, HuddleState>;
  channelNotificationPrefs?: Record<string, ChannelNotifyLevel>;
  onSetNotificationLevel?: (channelId: string, level: ChannelNotifyLevel) => void;
}

export function StarredList({
  starredChannels,
  starredDms,
  activeChannelId,
  activeDmId,
  onSelectChannel,
  onSelectDm,
  unreadCounts,
  presence,
  activeHuddles,
  channelNotificationPrefs,
  onSetNotificationLevel,
}: StarredListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [contextMenuChannelId, setContextMenuChannelId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: MouseEvent, channelId: string) => {
      if (!onSetNotificationLevel) return;
      e.preventDefault();
      setContextMenuChannelId(channelId);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    },
    [onSetNotificationLevel],
  );

  const pref = contextMenuChannelId ? channelNotificationPrefs?.[contextMenuChannelId] : undefined;

  if (starredChannels.length === 0 && starredDms.length === 0) {
    return null;
  }

  return (
    <div className="py-2" data-testid="starred-section">
      <button
        type="button"
        data-testid="starred-section-header"
        onClick={() => setCollapsed((prev) => !prev)}
        className="group w-full px-4 py-1 text-[13px] text-gray-400 font-semibold flex items-center justify-between hover:bg-white/10 rounded-sm bg-transparent border-none cursor-pointer text-left"
      >
        <span className="flex items-center gap-1">
          {/* Star icon (default) */}
          <svg
            className="w-3 h-3 group-hover:hidden"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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
          Starred
        </span>
      </button>
      {!collapsed && (
        <>
          {starredChannels.map((channel) => {
            const unread = unreadCounts[channel.id] ?? 0;
            const huddle = activeHuddles?.[channel.id];
            const chPref = channelNotificationPrefs?.[channel.id];
            const isMuted = chPref === "muted";

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                onContextMenu={(e) => handleContextMenu(e, channel.id)}
                data-testid={`starred-channel-${channel.id}`}
                className={clsx(
                  "flex w-full items-center justify-between py-1 pl-6 pr-4 border-none text-white text-left cursor-pointer text-sm",
                  activeChannelId === channel.id
                    ? "bg-white/15"
                    : "bg-transparent hover:bg-white/10",
                )}
              >
                <span className={clsx("flex items-center gap-1.5", unread > 0 && !isMuted && "font-bold")}>
                  {channel.type === "private" ? (
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  ) : "# "}{channel.name}
                  {isMuted && (
                    <svg className="w-3 h-3 text-gray-500 shrink-0" data-testid={`starred-muted-icon-${channel.id}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 5.714 0m-7.03-12.583A8.966 8.966 0 0 1 12 3c4.97 0 9 3.582 9 8a8.948 8.948 0 0 1-1.174 4.416M3 3l18 18M10.5 21h3" />
                    </svg>
                  )}
                  {huddle && (
                    <span className="flex items-center gap-0.5 text-green-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072" />
                      </svg>
                      <span className="text-[10px]">{huddle.participants.length}</span>
                    </span>
                  )}
                </span>
                {unread > 0 && !isMuted && (
                  <Badge variant="red" size="sm">
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })}
          {starredDms.map((dm) => {
            const unread = unreadCounts[dm.channel.id] ?? 0;
            const isOnline = presence[dm.otherUser.id]?.online ?? false;
            return (
              <button
                key={dm.channel.id}
                onClick={() => onSelectDm(dm.channel.id)}
                data-testid={`starred-dm-${dm.channel.id}`}
                className={clsx(
                  "flex w-full items-center justify-between py-1 pl-6 pr-4 border-none text-white text-left cursor-pointer text-sm",
                  activeDmId === dm.channel.id
                    ? "bg-white/15"
                    : "bg-transparent hover:bg-white/10",
                )}
              >
                <span className={clsx("flex items-center gap-1.5", unread > 0 && "font-bold")}>
                  <span
                    className={clsx(
                      "inline-block w-2 h-2 rounded-full shrink-0",
                      isOnline ? "bg-green-400" : "bg-gray-500",
                    )}
                  />
                  {dm.otherUser.displayName}
                </span>
                {unread > 0 && (
                  <Badge variant="red" size="sm">
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })}
        </>
      )}

      {/* Context menu for notification preferences */}
      {onSetNotificationLevel && (
        <DropdownMenu
          open={contextMenuChannelId !== null}
          onOpenChange={(open) => { if (!open) setContextMenuChannelId(null); }}
        >
          <DropdownMenuContent
            style={contextMenuPos ? { position: "fixed", left: contextMenuPos.x, top: contextMenuPos.y } : undefined}
          >
            <DropdownMenuItem
              onSelect={() => { if (contextMenuChannelId) onSetNotificationLevel(contextMenuChannelId, "all"); }}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-center">{(!pref || pref === "all") ? "\u2713" : ""}</span>
              All messages
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => { if (contextMenuChannelId) onSetNotificationLevel(contextMenuChannelId, "mentions"); }}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-center">{pref === "mentions" ? "\u2713" : ""}</span>
              Mentions only
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => { if (contextMenuChannelId) onSetNotificationLevel(contextMenuChannelId, "muted"); }}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-center">{pref === "muted" ? "\u2713" : ""}</span>
              Muted
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
