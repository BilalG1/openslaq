import { useState, useCallback, type MouseEvent } from "react";
import clsx from "clsx";
import { Check, Plus } from "lucide-react";
import type { Channel, HuddleState, ChannelNotifyLevel } from "@openslaq/shared";
import { Badge, Tooltip } from "../ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { HuddleIndicator } from "./HuddleIndicator";

interface ChannelListProps {
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  channels: Channel[];
  unreadCounts: Record<string, number>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCreateChannel?: () => void;
  activeHuddles?: Record<string, HuddleState>;
  channelNotificationPrefs?: Record<string, ChannelNotifyLevel>;
  onSetNotificationLevel?: (channelId: string, level: ChannelNotifyLevel) => void;
  onBrowseChannels?: () => void;
}

export function ChannelList({
  activeChannelId,
  onSelectChannel,
  channels,
  unreadCounts,
  collapsed,
  onToggleCollapsed,
  onCreateChannel,
  activeHuddles,
  channelNotificationPrefs,
  onSetNotificationLevel,
  onBrowseChannels,
}: ChannelListProps) {
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

  return (
    <div className="py-2">
      <button
        type="button"
        data-testid="channels-section-header"
        onClick={onToggleCollapsed}
        className="group w-full px-4 py-1 text-[13px] text-gray-400 font-semibold flex items-center justify-between hover:bg-white/10 rounded-sm bg-transparent border-none cursor-pointer text-left"
      >
        <span className="flex items-center gap-1">
          {/* Hash icon (default) */}
          <svg
            className="w-3 h-3 group-hover:hidden border border-border-default/60 rounded"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
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
          Channels
        </span>
        {onCreateChannel && (
          <Tooltip content="Create channel">
            <span
              role="button"
              data-testid="create-channel-button"
              onClick={(e) => { e.stopPropagation(); onCreateChannel(); }}
              className="opacity-0 group-hover:opacity-100 px-1 leading-none hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </span>
          </Tooltip>
        )}
      </button>
      {!collapsed &&
        channels.map((channel) => {
          const unread = unreadCounts[channel.id] ?? 0;
          const huddle = activeHuddles?.[channel.id];
          const chPref = channelNotificationPrefs?.[channel.id];
          const isMuted = chPref === "muted";

          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              onContextMenu={(e) => handleContextMenu(e, channel.id)}
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
                  <svg className="w-3 h-3 text-gray-500 shrink-0" data-testid={`muted-icon-${channel.id}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 5.714 0m-7.03-12.583A8.966 8.966 0 0 1 12 3c4.97 0 9 3.582 9 8a8.948 8.948 0 0 1-1.174 4.416M3 3l18 18M10.5 21h3" />
                  </svg>
                )}
                {huddle && (
                  <HuddleIndicator channelId={channel.id} participantCount={huddle.participants.length} />
                )}
              </span>
              {unread > 0 && !isMuted && (
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

      {!collapsed && onBrowseChannels && (
        <button
          type="button"
          data-testid="browse-channels-button"
          onClick={onBrowseChannels}
          className="flex w-full items-center gap-1.5 py-1 pl-6 pr-4 border-none bg-transparent text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer text-sm text-left"
        >
          <Plus className="w-3.5 h-3.5" />
          Add channels
        </button>
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
              data-testid={`ctx-notify-all-${contextMenuChannelId}`}
              onSelect={() => { if (contextMenuChannelId) onSetNotificationLevel(contextMenuChannelId, "all"); }}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-center">{(!pref || pref === "all") ? <Check size={14} /> : ""}</span>
              All messages
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid={`ctx-notify-mentions-${contextMenuChannelId}`}
              onSelect={() => { if (contextMenuChannelId) onSetNotificationLevel(contextMenuChannelId, "mentions"); }}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-center">{pref === "mentions" ? <Check size={14} /> : ""}</span>
              Mentions only
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid={`ctx-notify-muted-${contextMenuChannelId}`}
              onSelect={() => { if (contextMenuChannelId) onSetNotificationLevel(contextMenuChannelId, "muted"); }}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-center">{pref === "muted" ? <Check size={14} /> : ""}</span>
              Muted
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
