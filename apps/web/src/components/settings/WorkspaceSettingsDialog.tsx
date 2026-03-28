import { useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useAsyncEffect } from "../../hooks/useAsyncEffect";
import clsx from "clsx";
import type { BotApp, MarketplaceListing, WorkspaceFeatureFlags } from "@openslaq/shared";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import { useWorkspacesApi } from "../../hooks/api/useWorkspacesApi";
import { useBotsApi } from "../../hooks/api/useBotsApi";
import { useMarketplaceApi } from "../../hooks/api/useMarketplaceApi";
import { useFeatureFlagsApi } from "../../hooks/api/useFeatureFlagsApi";
import { useChatStore } from "../../state/chat-store";
import { getErrorMessage } from "../../lib/errors";
import { BotCreateDialog } from "./BotCreateDialog";
import { BotConfigDialog } from "./BotConfigDialog";
import { CustomEmojiManager } from "./CustomEmojiManager";
import { IntegrationsTab } from "./IntegrationsTab";
import { Users, Bot, Puzzle, Smile, AlertTriangle, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Input,
  Badge,
  Avatar,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useConfirm,
} from "../ui";

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

const roleVariant = { owner: "amber", admin: "blue", member: "gray" } as const;

type Tab = "members" | "bots" | "integrations" | "emoji" | "danger";

const tabMeta: Record<Tab, { label: string; icon: LucideIcon; description: string; ownerOnly?: boolean; adminOnly?: boolean }> = {
  members: { label: "Members", icon: Users, description: "View and manage workspace members" },
  bots: { label: "Bots", icon: Bot, description: "Install and configure bot integrations", adminOnly: true },
  integrations: { label: "Integrations", icon: Puzzle, description: "Browse and install marketplace integrations", adminOnly: true },
  emoji: { label: "Emoji", icon: Smile, description: "Manage custom emoji for this workspace" },
  danger: { label: "Danger Zone", icon: AlertTriangle, description: "Irreversible workspace actions" },
};

interface WorkspaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
}

export function WorkspaceSettingsDialog({ open, onOpenChange, workspaceSlug }: WorkspaceSettingsDialogProps) {
  const user = useCurrentUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("members");

  const [bots, setBots] = useState<BotApp[]>([]);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [configuringBot, setConfiguringBot] = useState<BotApp | null>(null);

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<WorkspaceFeatureFlags>({
    integrationGithub: false,
    integrationLinear: false,
    integrationSentry: false,
    integrationVercel: false,
  });

  const { confirm, dialog: confirmDialog } = useConfirm();
  const { dispatch } = useChatStore();
  const { listMembers, updateRole, removeMember, leaveWorkspace, deleteWorkspace } = useWorkspaceMembersApi();
  const { listWorkspaces } = useWorkspacesApi();
  const { listBotApps, toggleBotEnabled } = useBotsApi();
  const { listListings, install: installListing, uninstall: uninstallListing, getInstalled } = useMarketplaceApi();
  const { getFeatureFlags } = useFeatureFlagsApi();

  const currentUserRole = members.find((m) => m.id === user?.id)?.role;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const canManage = isOwner || isAdmin;

  useAsyncEffect(
    async (signal) => {
      if (!open || !user || !workspaceSlug) return;
      setLoading(true);
      setError(null);
      try {
        const [memberData, workspaces] = await Promise.all([
          listMembers(workspaceSlug),
          listWorkspaces(),
        ]);
        if (signal.cancelled) return;
        setMembers(memberData);
        const ws = workspaces.find((w) => w.slug === workspaceSlug);
        if (ws) setWorkspaceName(ws.name);
        try {
          const botData = await listBotApps(workspaceSlug);
          if (!signal.cancelled) setBots(botData);
        } catch { /* non-admin */ }
        try {
          const [listingData, installed, flags] = await Promise.all([
            listListings(),
            getInstalled(workspaceSlug),
            getFeatureFlags(workspaceSlug),
          ]);
          if (!signal.cancelled) {
            setListings(listingData);
            setInstalledIds(new Set(installed));
            setFeatureFlags(flags);
          }
        } catch { /* non-admin */ }
      } catch (err) {
        if (!signal.cancelled) setError(getErrorMessage(err, "Failed to load workspace settings"));
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [open, listMembers, listWorkspaces, listBotApps, listListings, getInstalled, getFeatureFlags, user, workspaceSlug],
  );

  const [prevOpen, setPrevOpen] = useState(false);

  if (!open && prevOpen) {
    setDeleteConfirm("");
    setError(null);
    setActiveTab("members");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const refreshMembers = async () => {
    if (!workspaceSlug) return;
    const data = await listMembers(workspaceSlug);
    setMembers(data);
  };

  const refreshBots = async () => {
    if (!workspaceSlug) return;
    try {
      const data = await listBotApps(workspaceSlug);
      setBots(data);
    } catch { /* ignore */ }
  };

  const handleToggleBot = async (botId: string, enabled: boolean) => {
    if (!workspaceSlug) return;
    try {
      await toggleBotEnabled(workspaceSlug, botId, enabled);
      await refreshBots();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to toggle bot"));
    }
  };

  const handleInstall = async (listingId: string) => {
    if (!workspaceSlug) return;
    setInstalling(true);
    try {
      await installListing(workspaceSlug, listingId);
      const installed = await getInstalled(workspaceSlug);
      setInstalledIds(new Set(installed));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to install integration"));
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (listingId: string) => {
    if (!workspaceSlug) return;
    setInstalling(true);
    try {
      await uninstallListing(workspaceSlug, listingId);
      const installed = await getInstalled(workspaceSlug);
      setInstalledIds(new Set(installed));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to uninstall integration"));
    } finally {
      setInstalling(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!workspaceSlug) return;
    try {
      await updateRole(workspaceSlug, userId, newRole);
      await refreshMembers();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update role"));
    }
  };

  const handleRemove = async (userId: string, displayName: string) => {
    if (!workspaceSlug) return;
    const ok = await confirm({ title: "Remove member", description: `Remove ${displayName} from the workspace?`, confirmLabel: "Remove", variant: "danger" });
    if (!ok) return;
    try {
      await removeMember(workspaceSlug, userId);
      await refreshMembers();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove member"));
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!workspaceSlug) return;
    const ok = await confirm({ title: "Leave workspace", description: `Leave "${workspaceName}"? You will need a new invite to rejoin.`, confirmLabel: "Leave", variant: "danger" });
    if (!ok) return;
    try {
      await leaveWorkspace(workspaceSlug);
      window.location.href = "/";
    } catch (err) {
      setError(getErrorMessage(err, "Failed to leave workspace"));
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceSlug) return;
    try {
      await deleteWorkspace(workspaceSlug);
      window.location.href = "/";
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete workspace"));
    }
  };

  if (!user) return null;

  const handleOpenProfile = (userId: string) => {
    dispatch({ type: "workspace/openProfile", userId });
    onOpenChange(false);
  };

  const canChangeRole = (member: Member) => {
    if (!canManage) return false;
    if (member.id === user.id) return false;
    if (member.role === "owner") return false;
    if (isAdmin && member.role === "admin") return false;
    return true;
  };

  const canRemoveMember = (member: Member) => {
    if (!canManage) return false;
    if (member.id === user.id) return false;
    if (member.role === "owner") return false;
    if (isAdmin && member.role === "admin") return false;
    return true;
  };

  const roleOptions = (member: Member) => {
    return ["member", "admin"].filter((r) => r !== member.role);
  };

  const allTabs = (Object.keys(tabMeta) as Tab[]).filter((key) => {
    const meta = tabMeta[key];
    if (meta.ownerOnly && !isOwner) return false;
    if (meta.adminOnly && !canManage) return false;
    return true;
  });

  const activeMeta = tabMeta[activeTab];
  const ActiveIcon = activeMeta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-h-[90vh] w-[720px] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border-default shrink-0">
          <DialogTitle>Workspace Settings</DialogTitle>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-muted">Loading...</div>
        ) : error ? (
          <div className="px-6 py-4 text-danger-text">{error}</div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Compact sidebar with accent bar */}
            <nav className="w-48 shrink-0 bg-surface-secondary border-r border-border-default p-3 flex flex-col gap-1 overflow-y-auto">
              {allTabs.map((tabId) => {
                const meta = tabMeta[tabId];
                const Icon = meta.icon;
                return (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => setActiveTab(tabId)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-md text-sm border-none cursor-pointer transition-colors flex items-center gap-2.5",
                      activeTab === tabId
                        ? "bg-surface-selected text-primary font-medium"
                        : "bg-transparent text-muted hover:bg-surface-tertiary hover:text-primary",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {meta.label}
                  </button>
                );
              })}
            </nav>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Section header */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <ActiveIcon className="w-5 h-5 text-muted" />
                  <h2 className="text-lg font-semibold text-primary m-0">{activeMeta.label}</h2>
                </div>
                <p className="text-sm text-muted m-0">{activeMeta.description}</p>
              </div>

              <div className="bg-surface-secondary rounded-xl p-4">
                {activeTab === "members" && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary m-0 mb-3">
                      Members ({members.length})
                    </h3>
                    <div className="bg-surface rounded-lg border border-border-default">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          data-testid={`member-row-${member.id}`}
                          className="flex items-center px-4 py-3 border-b border-border-secondary gap-3 last:border-b-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(member.id)}
                            className="bg-transparent border-none p-0 cursor-pointer"
                          >
                            <Avatar src={member.avatarUrl} fallback={member.displayName} size="md" shape="circle" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(member.id)}
                              className="bg-transparent border-none p-0 text-sm font-medium text-primary truncate cursor-pointer hover:underline"
                            >
                              {member.displayName}
                              {member.id === user.id && <span className="text-faint font-normal ml-1">(you)</span>}
                            </button>
                            <div className="text-xs text-muted">{member.email}</div>
                          </div>
                          <Badge variant={roleVariant[member.role as keyof typeof roleVariant] ?? "gray"} size="md" data-testid={`role-badge-${member.id}`}>
                            {member.role}
                          </Badge>
                          {canChangeRole(member) && (
                            <Select value="" onValueChange={(newRole) => void handleRoleChange(member.id, newRole)}>
                              <SelectTrigger size="sm" data-testid={`role-select-${member.id}`} className="border-border-strong">
                                <SelectValue placeholder="Change role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions(member).map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {canRemoveMember(member) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              data-testid={`remove-btn-${member.id}`}
                              onClick={() => { void handleRemove(member.id, member.displayName); }}
                              className="border-danger-border text-danger-text hover:bg-danger-bg"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "bots" && canManage && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-primary m-0">Bots ({bots.length})</h3>
                      <Button variant="primary" size="sm" data-testid="add-bot-btn" onClick={() => setShowCreateBot(true)}>
                        Add Bot
                      </Button>
                    </div>
                    {bots.length > 0 ? (
                      <div className="bg-surface rounded-lg border border-border-default">
                        {bots.map((bot) => (
                          <div key={bot.id} data-testid={`bot-row-${bot.id}`} className="flex items-center px-4 py-3 border-b border-border-secondary gap-3 last:border-b-0">
                            <Avatar src={bot.avatarUrl} fallback={bot.name} size="md" shape="rounded" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-primary truncate">{bot.name}</span>
                                <Badge variant="blue" size="sm">APP</Badge>
                                {!bot.enabled && <Badge variant="gray" size="sm">Disabled</Badge>}
                              </div>
                              {bot.description && <div className="text-xs text-muted truncate">{bot.description}</div>}
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={bot.enabled} onChange={(e) => void handleToggleBot(bot.id, e.target.checked)} data-testid={`bot-toggle-${bot.id}`} />
                              <span className="text-xs text-muted">{bot.enabled ? "On" : "Off"}</span>
                            </label>
                            <Button variant="secondary" size="sm" data-testid={`configure-bot-${bot.id}`} onClick={() => setConfiguringBot(bot)}>
                              Configure
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">No bots installed yet.</p>
                    )}
                  </div>
                )}

                {activeTab === "integrations" && canManage && (
                  <IntegrationsTab
                    listings={listings}
                    installedIds={installedIds}
                    installing={installing}
                    onInstall={(id) => { void handleInstall(id); }}
                    onUninstall={(id) => { void handleUninstall(id); }}
                    featureFlags={featureFlags}
                  />
                )}

                {activeTab === "emoji" && (
                  <CustomEmojiManager workspaceSlug={workspaceSlug} />
                )}

                {activeTab === "danger" && (
                  <div className="flex flex-col gap-4">
                    {!isOwner && (
                      <div className="bg-surface rounded-lg border border-danger-border p-4">
                        <h3 className="text-sm font-semibold text-danger-text m-0 mb-2">Leave Workspace</h3>
                        <p className="text-[13px] text-muted m-0 mb-3">
                          You will lose access to all channels and messages in this workspace. You will need a new invite to rejoin.
                        </p>
                        <Button
                          variant="danger"
                          size="sm"
                          data-testid="leave-workspace-btn"
                          onClick={() => { void handleLeaveWorkspace(); }}
                        >
                          Leave Workspace
                        </Button>
                      </div>
                    )}
                    {isOwner && (
                      <div className="bg-surface rounded-lg border border-danger-border p-4">
                        <h3 className="text-sm font-semibold text-danger-text m-0 mb-2">Delete Workspace</h3>
                        <p className="text-[13px] text-muted m-0 mb-3">
                          This action is irreversible. Type the workspace name <strong>{workspaceName}</strong> to confirm.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            variant="compact"
                            data-testid="delete-workspace-input"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder={workspaceName}
                            className="flex-1"
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            data-testid="delete-workspace-btn"
                            disabled={deleteConfirm !== workspaceName}
                            onClick={() => { void handleDeleteWorkspace(); }}
                            className={clsx(deleteConfirm !== workspaceName && "!bg-surface-tertiary !text-faint")}
                          >
                            Delete Workspace
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <BotCreateDialog open={showCreateBot} onOpenChange={setShowCreateBot} workspaceSlug={workspaceSlug} onCreated={() => void refreshBots()} />
      <BotConfigDialog key={configuringBot?.id} open={!!configuringBot} onOpenChange={(o) => { if (!o) setConfiguringBot(null); }} workspaceSlug={workspaceSlug} bot={configuringBot} onUpdated={() => void refreshBots()} />
      {confirmDialog}
    </Dialog>
  );
}
