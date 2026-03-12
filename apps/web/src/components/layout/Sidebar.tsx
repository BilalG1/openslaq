import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGalleryMode } from "../../gallery/gallery-context";
import { ChannelList } from "../channel/ChannelList";
import { StarredList } from "../channel/StarredList";
import { CreateChannelDialog } from "../channel/CreateChannelDialog";
import { DmList } from "../dm/DmList";
import { NewDmDialog } from "../dm/NewDmDialog";
import { CustomUserButton } from "../user/CustomUserButton";
import { WorkspaceSettingsDialog } from "../settings/WorkspaceSettingsDialog";
import { InviteDialog } from "../settings/InviteDialog";
import { ChevronDown } from "lucide-react";
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
  onStartGroupDm: (memberIds: string[]) => void;
  currentUserId: string;
  onStartDm: (userId: string) => void;
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
  activeView?: "channel" | "unreads" | "saved" | "scheduled" | "files";
  onSelectUnreadsView?: () => void;
  onSelectSavedView?: () => void;
  onSelectScheduledView?: () => void;
  onSelectFilesView?: () => void;
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
  onStartGroupDm,
  currentUserId,
  onStartDm,
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
  onSelectScheduledView,
  onSelectFilesView,
  onSetNotificationLevel,
  style,
}: SidebarProps) {
  const isGallery = useGalleryMode();
  const navigate = useNavigate();
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full p-4 font-bold text-lg text-white bg-transparent border-none border-b border-gray-800 cursor-pointer flex items-center justify-between text-left focus:outline-none"
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
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => navigate("/")}
            className="text-text-secondary text-[13px]"
          >
            All workspaces
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem
              onSelect={() => setInviteDialogOpen(true)}
              className="text-text-secondary text-[13px]"
            >
              Invite People
            </DropdownMenuItem>
          )}
          {canManage && (
            <DropdownMenuItem
              onSelect={() => setWorkspaceSettingsOpen(true)}
              className="text-text-secondary text-[13px]"
            >
              Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center justify-around px-2 py-2.5 gap-1">
        {onOpenSearch && (
          <Tooltip content={`Search (${navigator.platform.includes("Mac") ? "\u2318K" : "Ctrl+K"})`} side="bottom">
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border-none cursor-pointer bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white transition-all flex-1 min-w-0"
              data-testid="search-trigger"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[9px] font-medium">Search</span>
            </button>
          </Tooltip>
        )}
        {onSelectUnreadsView && (() => {
          const totalUnread = Object.entries(unreadCounts)
            .filter(([id]) => channelNotificationPrefs?.[id] !== "muted")
            .reduce((sum, [, count]) => sum + count, 0);
          return (
            <Tooltip content="All Unreads" side="bottom">
              <button
                type="button"
                onClick={onSelectUnreadsView}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                  activeView === "unreads"
                    ? "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/50"
                    : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
                }`}
                data-testid="unreads-view-link"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <span className="text-[9px] font-medium">Unreads</span>
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
          <Tooltip content="Saved Items" side="bottom">
            <button
              type="button"
              onClick={onSelectSavedView}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                activeView === "saved"
                  ? "bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              data-testid="saved-view-link"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              <span className="text-[9px] font-medium">Saved</span>
            </button>
          </Tooltip>
        )}
        {onSelectScheduledView && (
          <Tooltip content="Scheduled" side="bottom">
            <button
              type="button"
              onClick={onSelectScheduledView}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                activeView === "scheduled"
                  ? "bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-400/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              data-testid="scheduled-view-link"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-[9px] font-medium">Later</span>
            </button>
          </Tooltip>
        )}
        {onSelectFilesView && (
          <Tooltip content="Files" side="bottom">
            <button
              type="button"
              onClick={onSelectFilesView}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border-none cursor-pointer transition-all flex-1 min-w-0 ${
                activeView === "files"
                  ? "bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-400/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              data-testid="files-view-link"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-[9px] font-medium">Files</span>
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
          channels={channels.filter((ch) => !ch.isArchived)}
          unreadCounts={unreadCounts}
          collapsed={sidebarCollapse.channels}
          onToggleCollapsed={toggleChannelsCollapsed}
          onCreateChannel={() => setCreateChannelOpen(true)}
          activeHuddles={activeHuddles}
          channelNotificationPrefs={channelNotificationPrefs}
          onSetNotificationLevel={onSetNotificationLevel}
        />

        <DmList
          activeDmId={activeDmId}
          activeGroupDmId={activeGroupDmId}
          onSelectDm={onSelectDm}
          onSelectGroupDm={onSelectGroupDm}
          dms={dms}
          groupDms={groupDms}
          currentUserId={currentUserId}
          onNewDm={() => setNewDmOpen(true)}
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

      <NewDmDialog
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        onSelectUser={onStartDm}
        onCreateGroupDm={onStartGroupDm}
        workspaceSlug={workspaceSlug}
      />

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
