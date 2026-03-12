import { useCallback } from "react";
import { useParams } from "react-router-dom";
import type { OperationDeps } from "@openslaq/client-core";
import { useOperationDeps } from "./useOperationDeps";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

interface PaginationConfig {
  paginationSource: "channel" | "thread";
  paginationKey: string;
  direction: "older" | "newer";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadFn: (deps: OperationDeps, params: any) => void;
  extraParams?: Record<string, string>;
}

export function usePagination(config: PaginationConfig) {
  const { paginationSource, paginationKey, direction, loadFn, extraParams } = config;
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const isGallery = useGalleryMode();
  const deps = useOperationDeps();

  const paginationMap = paginationSource === "channel"
    ? state.channelPagination
    : state.threadPagination;
  const pagination = paginationMap[paginationKey];

  const cursorKey = direction === "older" ? "olderCursor" : "newerCursor";
  const loadingKey = direction === "older" ? "loadingOlder" : "loadingNewer";
  const hasKey = direction === "older" ? "hasOlder" : "hasNewer";

  const cursor = pagination?.[cursorKey] as string | undefined;
  const loading = (pagination?.[loadingKey] as boolean) ?? false;
  const hasMore = (pagination?.[hasKey] as boolean) ?? false;

  const load = useCallback(async () => {
    if (isGallery || !workspaceSlug || !cursor || loading || !hasMore) return;
    void loadFn(deps, { workspaceSlug, cursor, ...extraParams });
  }, [isGallery, workspaceSlug, cursor, loading, hasMore, deps, loadFn, extraParams]);

  return { load, loading, hasMore };
}
