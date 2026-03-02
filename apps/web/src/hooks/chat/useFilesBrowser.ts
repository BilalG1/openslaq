import { useState, useEffect, useCallback, useRef } from "react";
import { fetchFiles } from "@openslaq/client-core";
import type { FileBrowserItem, FileCategory } from "@openslaq/shared";
import { useChatStore } from "../../state/chat-store";
import { useAuthProvider } from "../../lib/api-client";
import { api } from "../../api";

export function useFilesBrowser(workspaceSlug: string | undefined) {
  const { state } = useChatStore();
  const auth = useAuthProvider();
  const [files, setFiles] = useState<FileBrowserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [category, setCategory] = useState<FileCategory | undefined>(undefined);
  const [channelId, setChannelId] = useState<string | undefined>(undefined);
  const isActive = state.activeView === "files";
  const fetchedRef = useRef(false);

  const deps = { api, auth };

  const load = useCallback(async (opts?: { append?: boolean; cursorOverride?: string }) => {
    if (!workspaceSlug) return;
    if (!opts?.append) setLoading(true);
    setError(null);
    try {
      const result = await fetchFiles(deps, {
        workspaceSlug,
        channelId,
        category,
        cursor: opts?.cursorOverride,
      });
      if (opts?.append) {
        setFiles((prev) => [...prev, ...result.files]);
      } else {
        setFiles(result.files);
      }
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, auth, channelId, category]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when view becomes active or filters change
  useEffect(() => {
    if (isActive && workspaceSlug) {
      fetchedRef.current = true;
      void load();
    }
    if (!isActive) {
      fetchedRef.current = false;
    }
  }, [isActive, workspaceSlug, channelId, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (nextCursor) {
      void load({ append: true, cursorOverride: nextCursor });
    }
  }, [nextCursor, load]);

  const changeCategory = useCallback((cat: FileCategory | undefined) => {
    setCategory(cat);
    setFiles([]);
    setNextCursor(null);
  }, []);

  const changeChannel = useCallback((id: string | undefined) => {
    setChannelId(id);
    setFiles([]);
    setNextCursor(null);
  }, []);

  return {
    files,
    loading,
    error,
    nextCursor,
    category,
    channelId,
    loadMore,
    changeCategory,
    changeChannel,
    refresh: load,
  };
}
