import { useState, useEffect, useCallback } from "react";
import type { ApiKey, BotScope } from "@openslaq/shared";
import { useApiKeysApi } from "../../hooks/api/useApiKeysApi";
import { getErrorMessage } from "../../lib/errors";
import { Button, Input, Badge, Switch, useConfirm } from "../ui";
import clsx from "clsx";

type ScopeCategory = {
  label: string;
  readScope: BotScope;
  readLabel: string;
  writeScope?: BotScope;
  writeLabel?: string;
};

const CATEGORIES: ScopeCategory[] = [
  { label: "Messages", readScope: "chat:read", readLabel: "Read", writeScope: "chat:write", writeLabel: "Write" },
  { label: "Channels", readScope: "channels:read", readLabel: "Read", writeScope: "channels:write", writeLabel: "Write" },
  { label: "Members", readScope: "channels:members:read", readLabel: "Read", writeScope: "channels:members:write", writeLabel: "Write" },
  { label: "Reactions", readScope: "reactions:read", readLabel: "Read", writeScope: "reactions:write", writeLabel: "Write" },
  { label: "Users & Presence", readScope: "users:read", readLabel: "Users" },
];

// Also include presence:read in Users & Presence
const EXTRA_READ_SCOPES: BotScope[] = ["presence:read"];

const ALL_READ_SCOPES: BotScope[] = [...CATEGORIES.map((c) => c.readScope), ...EXTRA_READ_SCOPES];
const ALL_WRITE_SCOPES: BotScope[] = CATEGORIES.filter((c) => c.writeScope).map((c) => c.writeScope!);

export function ApiKeysManager() {
  const { listApiKeys, createApiKey, deleteApiKey } = useApiKeysApi();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Set<BotScope>>(new Set());
  const [creating, setCreating] = useState(false);

  // Newly created token (shown once)
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listApiKeys();
      setKeys(result);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load API keys"));
    } finally {
      setLoading(false);
    }
  }, [listApiKeys]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const toggleScope = (scope: BotScope, enabled: boolean) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(scope);
        // For Users & Presence category, also add presence:read when users:read is enabled
        if (scope === "users:read") next.add("presence:read");
      } else {
        next.delete(scope);
        if (scope === "users:read") next.delete("presence:read");
      }
      return next;
    });
  };

  const selectAllRead = () => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      for (const s of ALL_READ_SCOPES) next.add(s);
      return next;
    });
  };

  const selectAllWrite = () => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      for (const s of ALL_WRITE_SCOPES) next.add(s);
      // Also enable all read scopes
      for (const s of ALL_READ_SCOPES) next.add(s);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedScopes(new Set([...ALL_READ_SCOPES, ...ALL_WRITE_SCOPES]));
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedScopes.size === 0) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createApiKey({ name: name.trim(), scopes: Array.from(selectedScopes) });
      setNewToken(result.token);
      setKeys((prev) => [result, ...prev]);
      setName("");
      setSelectedScopes(new Set());
      setShowCreate(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create API key"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (key: ApiKey) => {
    const ok = await confirm({ title: "Delete API key", description: `Delete API key "${key.name}"? This cannot be undone.`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    try {
      await deleteApiKey(String(key.id));
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete API key"));
    }
  };

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAnyScope = (cat: ScopeCategory) =>
    selectedScopes.has(cat.readScope) || (cat.writeScope ? selectedScopes.has(cat.writeScope) : false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary m-0">API Keys</h2>
        {!showCreate && !newToken && (
          <Button
            size="sm"
            data-testid="create-api-key-btn"
            onClick={() => setShowCreate(true)}
          >
            Create API Key
          </Button>
        )}
      </div>

      {error && (
        <div className="text-danger-text text-xs mb-3" data-testid="api-keys-error">
          {error}
        </div>
      )}

      {/* Token display after creation */}
      {newToken && (
        <div
          className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4"
          data-testid="new-token-display"
        >
          <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            API key created! Copy your token now — it won't be shown again.
          </div>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-white dark:bg-gray-900 text-xs px-3 py-2 rounded border border-green-300 dark:border-green-700 break-all select-all">
              {newToken}
            </code>
            <Button
              size="sm"
              variant="secondary"
              data-testid="copy-token-btn"
              onClick={() => void handleCopy(newToken)}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setNewToken(null);
              setCopied(false);
            }}
          >
            Done
          </Button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div
          className="bg-surface-secondary rounded-lg border border-border-default p-4 mb-4"
          data-testid="create-api-key-form"
        >
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">Key name</label>
            <Input
              variant="compact"
              data-testid="api-key-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CLI tool, CI pipeline"
              maxLength={100}
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted">Permissions</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllRead}
                  className="text-[10px] text-slaq-blue hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  All read
                </button>
                <button
                  type="button"
                  onClick={selectAllWrite}
                  className="text-[10px] text-slaq-blue hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  All write
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] text-slaq-blue hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Select all
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className={clsx(
                    "rounded-lg border-2 p-3 transition-colors bg-surface",
                    hasAnyScope(cat)
                      ? "border-slaq-blue/40"
                      : "border-border-default",
                  )}
                >
                  <div className="text-xs font-medium text-primary mb-2">{cat.label}</div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted">{cat.readLabel}</span>
                      <Switch
                        checked={selectedScopes.has(cat.readScope)}
                        onCheckedChange={(checked) => toggleScope(cat.readScope, checked)}
                        data-testid={`scope-${cat.readScope}`}
                      />
                    </div>
                    {cat.writeScope && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted">{cat.writeLabel}</span>
                        <Switch
                          checked={selectedScopes.has(cat.writeScope)}
                          onCheckedChange={(checked) => toggleScope(cat.writeScope!, checked)}
                          data-testid={`scope-${cat.writeScope}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-muted mt-2">
              {selectedScopes.size} scope{selectedScopes.size !== 1 ? "s" : ""} selected
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              data-testid="submit-api-key-btn"
              disabled={!name.trim() || selectedScopes.size === 0 || creating}
              onClick={() => void handleCreate()}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setName("");
                setSelectedScopes(new Set());
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="text-muted text-sm text-center py-4">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="text-muted text-sm text-center py-4" data-testid="no-api-keys">
          No API keys yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-surface-secondary rounded-lg border border-border-default">
          {keys.map((key) => (
            <div
              key={String(key.id)}
              data-testid={`api-key-row-${String(key.id)}`}
              className="flex items-center px-4 py-3 border-b border-border-secondary last:border-b-0 gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-primary">{key.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs text-muted">{key.tokenPrefix}...</code>
                  <span className="text-xs text-faint">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  {key.lastUsedAt && (
                    <span className="text-xs text-faint">
                      · Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} variant="gray" className="text-[10px]">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                data-testid={`delete-api-key-${String(key.id)}`}
                className="border-danger-border text-danger-text hover:bg-danger-bg shrink-0"
                onClick={() => void handleDelete(key)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
