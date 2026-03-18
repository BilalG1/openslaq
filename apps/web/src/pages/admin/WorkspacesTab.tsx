import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminApi } from "../../hooks/api/useAdminApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";

const FLAG_LABELS: Record<keyof WorkspaceFeatureFlags, string> = {
  integrationGithub: "GitHub",
  integrationLinear: "Linear",
  integrationSentry: "Sentry",
  integrationVercel: "Vercel",
};

const FLAG_KEYS = Object.keys(FLAG_LABELS) as Array<keyof WorkspaceFeatureFlags>;

interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  channelCount: number;
  messageCount: number;
  integrationGithub: boolean;
  integrationLinear: boolean;
  integrationSentry: boolean;
  integrationVercel: boolean;
}

export function WorkspacesTab() {
  const { getWorkspaces, updateAdminFeatureFlags, bulkUpdateFeatureFlag } = useAdminApi();
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [bulkFlag, setBulkFlag] = useState<keyof WorkspaceFeatureFlags>("integrationGithub");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(
    async (p: number, s: string) => {
      const result = await getWorkspaces(p, 20, s || undefined);
      if (result) {
        setWorkspaces(result.workspaces as AdminWorkspace[]);
        setTotalPages(result.totalPages);
      }
    },
    [getWorkspaces],
  );

  useEffect(() => {
    load(page, search);
  }, [load, page, search]);

  const onSearchChange = (value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const handleToggleFlag = async (workspaceId: string, flag: keyof WorkspaceFeatureFlags, enabled: boolean) => {
    try {
      await updateAdminFeatureFlags(workspaceId, { [flag]: enabled });
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, [flag]: enabled } : w)),
      );
    } catch {
      // reload to get correct state
      await load(page, search);
    }
  };

  const handleBulkUpdate = async (enabled: boolean) => {
    try {
      await bulkUpdateFeatureFlag(bulkFlag, enabled);
      // Reload to reflect changes
      await load(page, search);
    } catch {
      // ignore
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search workspaces by name or slug..."
        defaultValue=""
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      {/* Bulk Actions */}
      <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg border border-border-default">
        <span className="text-sm text-muted font-medium">Bulk Actions:</span>
        <select
          value={bulkFlag}
          onChange={(e) => setBulkFlag(e.target.value as keyof WorkspaceFeatureFlags)}
          className="text-sm bg-surface border border-border-default rounded px-2 py-1 text-primary"
          data-testid="bulk-flag-select"
        >
          {FLAG_KEYS.map((key) => (
            <option key={key} value={key}>
              {FLAG_LABELS[key]}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="primary"
          onClick={() => void handleBulkUpdate(true)}
          data-testid="bulk-enable-btn"
        >
          Enable All
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleBulkUpdate(false)}
          data-testid="bulk-disable-btn"
        >
          Disable All
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong text-left text-muted">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Slug</th>
              <th className="pb-2 pr-4 text-right">Members</th>
              <th className="pb-2 pr-4 text-right">Channels</th>
              <th className="pb-2 pr-4 text-right">Messages</th>
              {FLAG_KEYS.map((key) => (
                <th key={key} className="pb-2 pr-4 text-center">
                  {FLAG_LABELS[key]}
                </th>
              ))}
              <th className="pb-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr
                key={w.id}
                className="border-b border-border-strong/50 hover:bg-surface-secondary"
              >
                <td className="py-2 pr-4 font-medium text-primary">
                  {w.name}
                </td>
                <td className="py-2 pr-4 text-muted font-mono text-xs">
                  {w.slug}
                </td>
                <td className="py-2 pr-4 text-right">{w.memberCount}</td>
                <td className="py-2 pr-4 text-right">{w.channelCount}</td>
                <td className="py-2 pr-4 text-right">{w.messageCount}</td>
                {FLAG_KEYS.map((key) => (
                  <td key={key} className="py-2 pr-4 text-center">
                    <input
                      type="checkbox"
                      checked={w[key]}
                      onChange={(e) => void handleToggleFlag(w.id, key, e.target.checked)}
                      data-testid={`flag-${key}-${w.id}`}
                      className="cursor-pointer"
                    />
                  </td>
                ))}
                <td className="py-2 text-muted">{formatDate(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
