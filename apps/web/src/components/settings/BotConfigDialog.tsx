import { useState } from "react";
import type { BotApp } from "@openslaq/shared";
import { Dialog, DialogContent, DialogTitle, Button, Input, useConfirm } from "../ui";
import { BotScopeSelector } from "./BotScopeSelector";
import { useBotsApi } from "../../hooks/api/useBotsApi";
import { getErrorMessage } from "../../lib/errors";

interface BotConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  bot: BotApp | null;
  onUpdated: () => void;
}

export function BotConfigDialog({ open, onOpenChange, workspaceSlug, bot, onUpdated }: BotConfigDialogProps) {
  const { updateBotApp, deleteBotApp, regenerateToken } = useBotsApi();
  const [name, setName] = useState(bot?.name ?? "");
  const [description, setDescription] = useState(bot?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(bot?.avatarUrl ?? "");
  const [webhookUrl, setWebhookUrl] = useState(bot?.webhookUrl ?? "");
  const [scopes, setScopes] = useState<string[]>(bot?.scopes ? [...bot.scopes] : []);
  const [events, setEvents] = useState<string[]>(bot?.subscribedEvents ? [...bot.subscribedEvents] : []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  if (!bot) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateBotApp(workspaceSlug, bot.id, {
        name: name.trim(),
        description: description.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        webhookUrl: webhookUrl.trim(),
        scopes,
        subscribedEvents: events,
      });
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update bot"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: "Delete bot", description: `Delete bot "${bot.name}"? This cannot be undone.`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    try {
      await deleteBotApp(workspaceSlug, bot.id);
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete bot"));
    }
  };

  const handleRegenerate = async () => {
    const ok = await confirm({ title: "Regenerate token", description: "Regenerate the API token? The old token will stop working immediately.", confirmLabel: "Regenerate", variant: "danger" });
    if (!ok) return;
    try {
      const result = await regenerateToken(workspaceSlug, bot.id);
      setNewToken(result.apiToken);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to regenerate token"));
    }
  };

  const handleCopy = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[80vh] flex flex-col p-0">
        <div className="px-6 pt-5 pb-4 border-b border-border-default shrink-0">
          <DialogTitle>Configure Bot: {bot.name}</DialogTitle>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Name</label>
              <Input
                data-testid="bot-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Description</label>
              <Input
                data-testid="bot-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Avatar URL</label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Webhook URL</label>
              <Input
                data-testid="bot-webhook-input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <BotScopeSelector
              selectedScopes={scopes}
              onScopesChange={setScopes}
              selectedEvents={events}
              onEventsChange={setEvents}
            />

            {/* API Token */}
            <div className="border border-border-default rounded-lg p-3">
              <div className="text-sm font-medium text-primary mb-1">API Token</div>
              <div className="text-xs text-faint mb-2">Prefix: {bot.apiTokenPrefix}...</div>
              {newToken ? (
                <div className="flex gap-2">
                  <code className="flex-1 bg-surface-secondary px-3 py-2 rounded text-xs font-mono break-all border border-border-default">
                    {newToken}
                  </code>
                  <Button variant="primary" size="sm" onClick={() => void handleCopy()}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  data-testid="regenerate-token-btn"
                  onClick={() => void handleRegenerate()}
                >
                  Regenerate Token
                </Button>
              )}
            </div>

            {/* Delete */}
            <div className="border border-danger-border rounded-lg p-3">
              <div className="text-sm font-medium text-danger-text mb-1">Delete Bot</div>
              <p className="text-xs text-faint m-0 mb-2">
                This will permanently remove the bot and all its data.
              </p>
              <Button
                variant="danger"
                size="sm"
                data-testid="delete-bot-btn"
                onClick={() => void handleDelete()}
              >
                Delete Bot
              </Button>
            </div>

            {error && <div className="text-sm text-danger-text">{error}</div>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border-default flex justify-end gap-2 shrink-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            data-testid="save-bot-btn"
            disabled={!name.trim() || !webhookUrl.trim() || scopes.length === 0 || saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
      {confirmDialog}
    </Dialog>
  );
}
