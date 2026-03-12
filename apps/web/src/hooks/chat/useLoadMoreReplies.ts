import { useMemo } from "react";
import { loadOlderReplies } from "@openslaq/client-core";
import { usePagination } from "./usePagination";

export function useLoadMoreReplies(channelId: string, parentMessageId: string) {
  const extraParams = useMemo(() => ({ channelId, parentMessageId }), [channelId, parentMessageId]);
  const { load, loading, hasMore } = usePagination({
    paginationSource: "thread",
    paginationKey: parentMessageId,
    direction: "older",
    loadFn: loadOlderReplies,
    extraParams,
  });

  return { loadOlder: load, loadingOlder: loading, hasOlder: hasMore };
}
