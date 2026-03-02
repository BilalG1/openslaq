import { useState, useEffect, useCallback, useRef } from "react";
import { fetchSavedMessages, fetchSavedMessageIds } from "@openslaq/client-core";
import type { SavedMessageItem } from "@openslaq/client-core";
import { useChatStore } from "../../state/chat-store";
import { useAuthProvider } from "../../lib/api-client";
import { api } from "../../api";

export function useSavedMessages(workspaceSlug: string | undefined) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const [data, setData] = useState<SavedMessageItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = state.activeView === "saved";
  const fetchedRef = useRef(false);

  const deps = { api, auth, dispatch, getState: () => state };

  const refresh = useCallback(async () => {
    if (!workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSavedMessages(deps, { workspaceSlug });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved messages");
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when view becomes active
  useEffect(() => {
    if (isActive && workspaceSlug) {
      fetchedRef.current = true;
      void refresh();
    }
    if (!isActive) {
      fetchedRef.current = false;
    }
  }, [isActive, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeItem = useCallback((messageId: string) => {
    setData((prev) =>
      prev ? prev.filter((item) => item.message.id !== messageId) : prev,
    );
  }, []);

  return { data, loading, error, refresh, removeItem };
}

export function useSavedMessageIds(workspaceSlug: string | undefined) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const fetchedRef = useRef(false);

  const deps = { api, auth, dispatch, getState: () => state };

  // Fetch saved IDs at bootstrap
  useEffect(() => {
    if (!workspaceSlug || fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchSavedMessageIds(deps, { workspaceSlug }).then((ids) => {
      dispatch({ type: "saved/set", messageIds: ids });
    });
  }, [workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps
}
