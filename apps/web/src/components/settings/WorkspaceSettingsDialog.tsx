import { useEffect, useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import clsx from "clsx";
import type { BotApp } from "@openslaq/shared";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import { useWorkspacesApi } from "../../hooks/api/useWorkspacesApi";
import { useBotsApi } from "../../hooks/api/useBotsApi";
import { useChatStore } from "../../state/chat-store";
import { getErrorMessage } from "../../lib/errors";
import { BotCreateDialog } from "./BotCreateDialog";
import { BotConfigDialog } from "./BotConfigDialog";
import { CustomEmojiManager } from "./CustomEmojiManager";
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
} from "../ui";

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

const roleVariant = { owner: "amber", admin: "blue", member: "gray" } as const;

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

  const [bots, setBots] = useState<BotApp[]>([]);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [configuringBot, setConfiguringBot] = useState<BotApp | null>(null);

  const { dispatch } = useChatStore();
  const { listMembers, updateRole, removeMember, deleteWorkspace } = useWorkspaceMembersApi();
  const { listWorkspaces } = useWorkspacesApi();
  const { listBotApps, toggleBotEnabled } = useBotsApi();

  const currentUserRole = members.find((m) => m.id === user?.id)?.role;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (!open || !user || !workspaceSlug) return;

    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [memberData, workspaces] = await Promise.all([
          listMembers(workspaceSlug),
          listWorkspaces(),
        ]);

        if (cancelled) return;

        setMembers(memberData);
        const ws = workspaces.find((w) => w.slug === workspaceSlug);
        if (ws) {
          setWorkspaceName(ws.name);
        }

        // Load bots (only visible to admin+, but load attempt won't error for members)
        try {
          const botData = await listBotApps(workspaceSlug);
          if (!cancelled) setBots(botData);
        } catch {
          // Non-admin can't list bots — that's fine
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load workspace settings"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [open, listMembers, listWorkspaces, listBotApps, user, workspaceSlug]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setDeleteConfirm("");
      setError(null);
    }
  }, [open]);

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
    } catch { /* ignore if non-admin */ }
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
    if (!confirm(`Remove ${displayName} from the workspace?`)) return;

    try {
      await removeMember(workspaceSlug, userId);
      await refreshMembers();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove member"));
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceSlug) return;
    try {
      await deleteWorkspace(workspaceSlug);
      // Hard navigation — dialog overlay blocks React Router navigation
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

  const canRemove = (member: Member) => {
    if (!canManage) return false;
    if (member.id === user.id) return false;
    if (member.role === "owner") return false;
    if (isAdmin && member.role === "admin") return false;
    return true;
  };

  const roleOptions = (member: Member) => {
    const options: string[] = ["member", "admin"];
    return options.filter((r) => r !== member.role);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[80vh] flex flex-col p-0">
        <div className="px-6 pt-5 pb-4 border-b border-border-default shrink-0">
          <DialogTitle>Workspace Settings</DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-muted">Loading...</div>
          ) : error ? (
            <div className="text-danger-text">{error}</div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-semibold text-primary m-0 mb-3">
                  Members ({members.length})
                </h2>
                <div className="bg-surface-secondary rounded-lg border border-border-default">
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
                        <Avatar
                          src={member.avatarUrl}
                          fallback={member.displayName}
                          size="md"
                          shape="circle"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(member.id)}
                          className="bg-transparent border-none p-0 text-sm font-medium text-primary truncate cursor-pointer hover:underline"
                        >
                          {member.displayName}
                          {member.id === user.id && (
                            <span className="text-faint font-normal ml-1">(you)</span>
                          )}
                        </button>
                        <div className="text-xs text-muted">{member.email}</div>
                      </div>

                      <Badge
                        variant={roleVariant[member.role as keyof typeof roleVariant] ?? "gray"}
                        size="md"
                        data-testid={`role-badge-${member.id}`}
                      >
                        {member.role}
                      </Badge>

                      {canChangeRole(member) && (
                        <Select
                          value=""
                          onValueChange={(newRole) => void handleRoleChange(member.id, newRole)}
                        >
                          <SelectTrigger
                            size="sm"
                            data-testid={`role-select-${member.id}`}
                            className="border-border-strong"
                          >
                            <SelectValue placeholder="Change role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions(member).map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {canRemove(member) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          data-testid={`remove-btn-${member.id}`}
                          onClick={() => {
                            void handleRemove(member.id, member.displayName);
                          }}
                          className="border-danger-border text-danger-text hover:bg-danger-bg"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {canManage && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-primary m-0">
                      Bots ({bots.length})
                    </h2>
                    <Button
                      variant="primary"
                      size="sm"
                      data-testid="add-bot-btn"
                      onClick={() => setShowCreateBot(true)}
                    >
                      Add Bot
                    </Button>
                  </div>
                  {bots.length > 0 && (
                    <div className="bg-surface-secondary rounded-lg border border-border-default">
                      {bots.map((bot) => (
                        <div
                          key={bot.id}
                          data-testid={`bot-row-${bot.id}`}
                          className="flex items-center px-4 py-3 border-b border-border-secondary gap-3 last:border-b-0"
                        >
                          <Avatar
                            src={bot.avatarUrl}
                            fallback={bot.name}
                            size="md"
                            shape="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary truncate">{bot.name}</span>
                              <Badge variant="blue" size="sm">APP</Badge>
                              {!bot.enabled && <Badge variant="gray" size="sm">Disabled</Badge>}
                            </div>
                            {bot.description && (
                              <div className="text-xs text-muted truncate">{bot.description}</div>
                            )}
                          </div>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bot.enabled}
                              onChange={(e) => void handleToggleBot(bot.id, e.target.checked)}
                              data-testid={`bot-toggle-${bot.id}`}
                            />
                            <span className="text-xs text-muted">{bot.enabled ? "On" : "Off"}</span>
                          </label>

                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`configure-bot-${bot.id}`}
                            onClick={() => setConfiguringBot(bot)}
                          >
                            Configure
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <CustomEmojiManager workspaceSlug={workspaceSlug} />

              {isOwner && (
                <div className="bg-surface-secondary rounded-lg border border-danger-border p-4">
                  <h2 className="text-sm font-semibold text-danger-text m-0 mb-2">
                    Delete Workspace
                  </h2>
                  <p className="text-[13px] text-muted m-0 mb-3">
                    This action is irreversible. Type the workspace name <strong>{workspaceName}</strong> to
                    confirm.
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
                      onClick={() => {
                        void handleDeleteWorkspace();
                      }}
                      className={clsx(
                        deleteConfirm !== workspaceName && "!bg-surface-tertiary !text-faint",
                      )}
                    >
                      Delete Workspace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      <BotCreateDialog
        open={showCreateBot}
        onOpenChange={setShowCreateBot}
        workspaceSlug={workspaceSlug}
        onCreated={() => void refreshBots()}
      />
      <BotConfigDialog
        open={!!configuringBot}
        onOpenChange={(open) => { if (!open) setConfiguringBot(null); }}
        workspaceSlug={workspaceSlug}
        bot={configuringBot}
        onUpdated={() => void refreshBots()}
      />
    </Dialog>
  );
}
