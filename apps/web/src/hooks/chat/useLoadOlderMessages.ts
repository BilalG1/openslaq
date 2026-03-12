import { useMemo } from "react";
import { loadOlderMessages } from "@openslaq/client-core";
import { usePagination } from "./usePagination";

export function useLoadOlderMessages(channelId: string) {
  const extraParams = useMemo(() => ({ channelId }), [channelId]);
  const { load, loading, hasMore } = usePagination({
    paginationSource: "channel",
    paginationKey: channelId,
    direction: "older",
    loadFn: loadOlderMessages,
    extraParams,
  });

  return { loadOlder: load, loadingOlder: loading, hasOlder: hasMore };
}
