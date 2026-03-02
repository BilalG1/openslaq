import { useState, useEffect, useCallback, useRef } from "react";
import { fetchScheduledMessages, fetchScheduledCountForChannel } from "@openslaq/client-core";
import type { ScheduledMessageItem } from "@openslaq/client-core";
import { useChatStore } from "../../state/chat-store";
import { useAuthProvider } from "../../lib/api-client";
import { api } from "../../api";
import { useSocketEvent } from "../useSocketEvent";

export function useScheduledMessages(workspaceSlug: string | undefined) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const [data, setData] = useState<ScheduledMessageItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = state.activeView === "scheduled";
  const fetchedRef = useRef(false);

  const deps = { api, auth, dispatch, getState: () => state };

  const refresh = useCallback(async () => {
    if (!workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchScheduledMessages(deps, { workspaceSlug });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scheduled messages");
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

  const removeItem = useCallback((id: string) => {
    setData((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<ScheduledMessageItem>) => {
    setData((prev) =>
      prev
        ? prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        : prev,
    );
  }, []);

  return { data, loading, error, refresh, removeItem, updateItem };
}

export function useScheduledCountForChannel(
  channelId: string | undefined,
  workspaceSlug: string | undefined,
) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const [count, setCount] = useState(0);

  const deps = { api, auth, dispatch, getState: () => state };

  const refresh = useCallback(async () => {
    if (!workspaceSlug || !channelId) {
      setCount(0);
      return;
    }
    try {
      const result = await fetchScheduledCountForChannel(deps, { workspaceSlug, channelId });
      setCount(result);
    } catch {
      setCount(0);
    }
  }, [workspaceSlug, channelId, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refresh();
  }, [channelId, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh on socket events
  useSocketEvent("scheduledMessage:created", () => void refresh());
  useSocketEvent("scheduledMessage:deleted", () => void refresh());
  useSocketEvent("scheduledMessage:sent", () => void refresh());

  return { count, refresh };
}
