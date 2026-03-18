import { useState, useEffect, useCallback, useRef } from "react";
import { fetchDrafts, deleteDraftOp } from "@openslaq/client-core";
import type { DraftItem } from "@openslaq/client-core";
import { useChatStore } from "../../state/chat-store";
import { useAuthProvider } from "../../lib/api-client";
import { api } from "../../api";

export function useDrafts(workspaceSlug: string | undefined) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const [data, setData] = useState<DraftItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = state.activeView === "outbox";
  const fetchedRef = useRef(false);

  const deps = { api, auth, dispatch, getState: () => state };

  const refresh = useCallback(async () => {
    if (!workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDrafts(deps, { workspaceSlug });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isActive && workspaceSlug) {
      fetchedRef.current = true;
      void refresh();
    }
    if (!isActive) {
      fetchedRef.current = false;
    }
  }, [isActive, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeItem = useCallback(
    async (id: string) => {
      if (!workspaceSlug) return;
      try {
        await deleteDraftOp(deps, { workspaceSlug, id });
        setData((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
      } catch {
        // ignore
      }
    },
    [workspaceSlug, auth], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { data, loading, error, refresh, removeItem };
}
