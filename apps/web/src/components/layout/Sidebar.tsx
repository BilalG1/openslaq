import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useGalleryMode } from "../../gallery/gallery-context";
import { ChannelList } from "../channel/ChannelList";
import { StarredList } from "../channel/StarredList";
import { CreateChannelDialog } from "../channel/CreateChannelDialog";
import { BrowseChannelsDialog } from "../channel/BrowseChannelsDialog";
import { DmList } from "../dm/DmList";
import { CustomUserButton } from "../user/CustomUserButton";
import { WorkspaceSettingsDialog } from "../settings/WorkspaceSettingsDialog";
import { InviteDialog } from "../settings/InviteDialog";
import { ChevronDown, LayoutGrid, UserPlus, Settings, Search, Mail, Bookmark, Clock, FileText } from "lucide-react";
import { Tooltip } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import type { Channel, HuddleState, ChannelNotifyLevel } from "@openslaq/shared";
import type { WorkspaceInfo, DmConversation, GroupDmConversation, PresenceEntry } from "../../state/chat-store";

interface SidebarProps {
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  channels: Channel[];
  activeDmId: string | null;
  onSelectDm: (channelId: string) => void;
  dms: DmConversation[];
  groupDms: GroupDmConversation[];
  activeGroupDmId: string | null;
  onSelectGroupDm: (channelId: string) => void;
  currentUserId: string;
  workspaceSlug: string;
  workspaces: WorkspaceInfo[];
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  onOpenSearch?: () => void;
  onChannelCreated?: (channel: Channel) => void;
  activeHuddles?: Record<string, HuddleState>;
  starredChannelIds?: string[];
  channelNotificationPrefs?: Record<string, ChannelNotifyLevel>;
  onSetNotificationLevel?: (channelId: string, level: ChannelNotifyLevel) => void;
  activeView?: "channel" | "unreads" | "saved" | "outbox" | "files" | "compose";
  onSelectUnreadsView?: () => void;
  onSelectSavedView?: () => void;
  onSelectOutboxView?: () => void;
  onSelectFilesView?: () => void;
  onSelectComposeView?: () => void;
  style?: React.CSSProperties;
}

function loadCollapseState(): { channels: boolean; dms: boolean } {
  try {
    const stored = localStorage.getItem("openslaq-sidebar-collapse");
    if (stored) return JSON.parse(stored) as { channels: boolean; dms: boolean };
  } catch {
    // ignore
  }
  return { channels: false, dms: false };
}

export function Sidebar({
  activeChannelId,
  onSelectChannel,
  channels,
  activeDmId,
  onSelectDm,
  dms,
  groupDms,
  activeGroupDmId,
  onSelectGroupDm,
  currentUserId,
  workspaceSlug,
  workspaces,
  unreadCounts,
  presence,
  onOpenSearch,
  onChannelCreated,
  activeHuddles,
  starredChannelIds,
  channelNotificationPrefs,
  activeView,
  onSelectUnreadsView,
  onSelectSavedView,
  onSelectOutboxView,
  onSelectFilesView,
  onSelectComposeView,
  onSetNotificationLevel,
  style,
}: SidebarProps) {
  const isGallery = useGalleryMode();
  const navigate = useNavigate();
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [browseChannelsOpen, setBrowseChannelsOpen] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [sidebarCollapse, setSidebarCollapse] = useState(loadCollapseState);

  const toggleChannelsCollapsed = useCallback(() => {
    setSidebarCollapse((prev) => {
      const next = { ...prev, channels: !prev.channels };
      localStorage.setItem("openslaq-sidebar-collapse", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleDmsCollapsed = useCallback(() => {
    setSidebarCollapse((prev) => {
      const next = { ...prev, dms: !prev.dms };
      localStorage.setItem("openslaq-sidebar-collapse", JSON.stringify(next));
      return next;
    });
  }, []);

  const currentWorkspace = workspaces.find((ws) => ws.slug === workspaceSlug);
  const workspaceName = currentWorkspace?.name ?? workspaceSlug;
  const canManage = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  return (
    <div className="shrink-0 bg-gray-900 text-white flex flex-col" style={style}>
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex-1 min-w-0 p-4 font-bold text-lg text-white bg-transparent border-none border-b border-gray-800 cursor-pointer flex items-center text-left focus:outline-none"
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {workspaceName}
              </span>
              <ChevronDown size={14} className="ml-2 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={0} className="min-w-[200px] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
            {workspaces
              .filter((ws) => ws.slug !== workspaceSlug)
              .map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onSelect={() => navigate(`/w/${ws.slug}`)}
                  className="flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{ws.name.charAt(0).toUpperCase()}</span>
                  {ws.name}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigate("/")}
              className="text-text-secondary text-[13px] flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              All workspaces
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setInviteDialogOpen(true)}
              className="text-text-secondary text-[13px] flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite People
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setWorkspaceSettingsOpen(true)}
              className="text-text-secondary text-[13px] flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onOpenSearch && (
          <Tooltip content={`Search (${navigator.platform.includes("Mac") ? "\u2318K" : "Ctrl+K"})`} side="bottom">
            <button
              type="button"
              onClick={onOpenSearch}
              className="mr-3 shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-all border-none cursor-pointer"
              data-testid="search-trigger"
            >
              <Search className="w-[15px] h-[15px]" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center justify-around px-2 py-2.5 gap-1">
        {onSelectUnreadsView && (() => {
          const totalUnread = Object.entries(unreadCounts)
            .filter(([id]) => channelNotificationPrefs?.[id] !== "muted")
            .reduce((sum, [, count]) => sum + count, 0);
          return (
            <Tooltip content="Unreads" side="bottom">
              <button
                type="button"
                onClick={onSelectUnreadsView}
                className={`relative flex items-center justify-center py-2 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                  activeView === "unreads"
                    ? "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/50"
                    : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
                }`}
                data-testid="unreads-view-link"
              >
                <Mail className="w-[18px] h-[18px]" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-red-500 text-white rounded-full w-[14px] h-[14px] flex items-center justify-center">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })()}
        {onSelectSavedView && (
          <Tooltip content="Saved" side="bottom">
            <button
              type="button"
              onClick={onSelectSavedView}
              className={`flex items-center justify-center py-2 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                activeView === "saved"
                  ? "bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              data-testid="saved-view-link"
            >
              <Bookmark className="w-[18px] h-[18px]" />
            </button>
          </Tooltip>
        )}
        {onSelectOutboxView && (
          <Tooltip content="Outbox" side="bottom">
            <button
              type="button"
              onClick={onSelectOutboxView}
              className={`flex items-center justify-center py-2 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                activeView === "outbox"
                  ? "bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-400/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              data-testid="outbox-view-link"
            >
              <Clock className="w-[18px] h-[18px]" />
            </button>
          </Tooltip>
        )}
        {onSelectFilesView && (
          <Tooltip content="Files" side="bottom">
            <button
              type="button"
              onClick={onSelectFilesView}
              className={`flex items-center justify-center py-2 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                activeView === "files"
                  ? "bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-400/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              data-testid="files-view-link"
            >
              <FileText className="w-[18px] h-[18px]" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {starredChannelIds && starredChannelIds.length > 0 && (() => {
          const starredSet = new Set(starredChannelIds);
          const starredChannels = channels.filter((ch) => starredSet.has(ch.id) && !ch.isArchived);
          const starredDmsItems = dms.filter((dm) => starredSet.has(dm.channel.id));
          return (
            <StarredList
              starredChannels={starredChannels}
              starredDms={starredDmsItems}
              activeChannelId={activeChannelId}
              activeDmId={activeDmId}
              onSelectChannel={onSelectChannel}
              onSelectDm={onSelectDm}
              unreadCounts={unreadCounts}
              presence={presence}
              activeHuddles={activeHuddles}
              channelNotificationPrefs={channelNotificationPrefs}
              onSetNotificationLevel={onSetNotificationLevel}
            />
          );
        })()}

        <ChannelList
          activeChannelId={activeChannelId}
          onSelectChannel={onSelectChannel}
          channels={channels.filter((ch) => !ch.isArchived && !starredChannelIds?.includes(ch.id)).sort((a, b) => { if (a.type !== b.type) return a.type === "public" ? -1 : 1; return a.name.localeCompare(b.name); })}
          unreadCounts={unreadCounts}
          collapsed={sidebarCollapse.channels}
          onToggleCollapsed={toggleChannelsCollapsed}
          onCreateChannel={() => setCreateChannelOpen(true)}
          onBrowseChannels={() => setBrowseChannelsOpen(true)}
          activeHuddles={activeHuddles}
          channelNotificationPrefs={channelNotificationPrefs}
          onSetNotificationLevel={onSetNotificationLevel}
        />

        <DmList
          activeDmId={activeDmId}
          activeGroupDmId={activeGroupDmId}
          onSelectDm={onSelectDm}
          onSelectGroupDm={onSelectGroupDm}
          dms={dms.filter((dm) => !starredChannelIds?.includes(dm.channel.id))}
          groupDms={groupDms.filter((g) => !starredChannelIds?.includes(g.channel.id))}
          currentUserId={currentUserId}
          onNewDm={() => onSelectComposeView?.()}
          unreadCounts={unreadCounts}
          presence={presence}
          collapsed={sidebarCollapse.dms}
          onToggleCollapsed={toggleDmsCollapsed}
          activeHuddles={activeHuddles}
        />
      </div>

      {!isGallery && (
        <div className="border-t border-gray-800 p-2">
          <CustomUserButton showUserInfo />
        </div>
      )}

      <CreateChannelDialog
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        onChannelCreated={(channel) => {
          setCreateChannelOpen(false);
          onChannelCreated?.(channel);
        }}
        workspaceSlug={workspaceSlug}
        canCreatePrivate={canManage}
      />

      <BrowseChannelsDialog
        open={browseChannelsOpen}
        onClose={() => setBrowseChannelsOpen(false)}
        workspaceSlug={workspaceSlug}
        isAdmin={canManage}
        onChannelJoined={(channel) => {
          onChannelCreated?.(channel);
        }}
      />

      <WorkspaceSettingsDialog
        open={workspaceSettingsOpen}
        onOpenChange={setWorkspaceSettingsOpen}
        workspaceSlug={workspaceSlug}
      />

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
