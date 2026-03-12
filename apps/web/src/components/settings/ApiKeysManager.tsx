import { useState, useEffect } from "react";
import type { ApiKey, BotScope } from "@openslaq/shared";
import { useApiKeysApi } from "../../hooks/api/useApiKeysApi";
import { getErrorMessage } from "../../lib/errors";
import { Button, Input, Badge } from "../ui";

const SCOPE_GROUPS: { label: string; scopes: { value: BotScope; label: string }[] }[] = [
  {
    label: "Messages",
    scopes: [
      { value: "chat:read", label: "Read messages" },
      { value: "chat:write", label: "Send messages" },
    ],
  },
  {
    label: "Channels",
    scopes: [
      { value: "channels:read", label: "List channels" },
      { value: "channels:write", label: "Manage channels" },
    ],
  },
  {
    label: "Members",
    scopes: [
      { value: "channels:members:read", label: "View members" },
      { value: "channels:members:write", label: "Manage members" },
    ],
  },
  {
    label: "Reactions",
    scopes: [
      { value: "reactions:read", label: "Read reactions" },
      { value: "reactions:write", label: "Add reactions" },
    ],
  },
  {
    label: "Users & Presence",
    scopes: [
      { value: "users:read", label: "View users" },
      { value: "presence:read", label: "View presence" },
    ],
  },
];

export function ApiKeysManager() {
  const { listApiKeys, createApiKey, deleteApiKey } = useApiKeysApi();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Newly created token (shown once)
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const result = await listApiKeys();
      setKeys(result);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load API keys"));
    } finally {
      setLoading(false);
    }
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedScopes.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createApiKey({ name: name.trim(), scopes: selectedScopes });
      setNewToken(result.token);
      setKeys((prev) => [result, ...prev]);
      setName("");
      setSelectedScopes([]);
      setShowCreate(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create API key"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (key: ApiKey) => {
    if (!confirm(`Delete API key "${key.name}"? This cannot be undone.`)) return;
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
            <label className="block text-xs font-medium text-muted mb-2">Permissions</label>
            <div className="flex flex-col gap-3">
              {SCOPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-xs font-medium text-secondary mb-1">{group.label}</div>
                  <div className="flex flex-col gap-1">
                    {group.scopes.map((scope) => (
                      <label key={scope.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                          data-testid={`scope-${scope.value}`}
                        />
                        <span className="text-sm text-primary">{scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              data-testid="submit-api-key-btn"
              disabled={!name.trim() || selectedScopes.length === 0 || creating}
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
                setSelectedScopes([]);
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
    </div>
  );
}
