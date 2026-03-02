import { useState, useCallback } from "react";
import { fetchFiles } from "@openslaq/client-core";
import type { FileBrowserItem } from "@openslaq/shared";
import { useAuthProvider } from "../../lib/api-client";
import { api } from "../../api";

export function useChannelFiles(workspaceSlug: string | undefined) {
  const auth = useAuthProvider();
  const [files, setFiles] = useState<FileBrowserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const deps = { api, auth };

  const loadFiles = useCallback(async (channelId: string) => {
    if (!workspaceSlug) return;
    setLoading(true);
    setFiles([]);
    setNextCursor(null);
    try {
      const result = await fetchFiles(deps, { workspaceSlug, channelId });
      setFiles(result.files);
      setNextCursor(result.nextCursor);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async (channelId: string) => {
    if (!workspaceSlug || !nextCursor) return;
    try {
      const result = await fetchFiles(deps, { workspaceSlug, channelId, cursor: nextCursor });
      setFiles((prev) => [...prev, ...result.files]);
      setNextCursor(result.nextCursor);
    } catch {
      // ignore
    }
  }, [workspaceSlug, auth, nextCursor]); // eslint-disable-line react-hooks/exhaustive-deps

  return { files, loading, nextCursor, loadFiles, loadMore };
}
