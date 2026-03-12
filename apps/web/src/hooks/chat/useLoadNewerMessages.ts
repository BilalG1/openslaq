import { useMemo } from "react";
import { loadNewerMessages } from "@openslaq/client-core";
import { usePagination } from "./usePagination";

export function useLoadNewerMessages(channelId: string) {
  const extraParams = useMemo(() => ({ channelId }), [channelId]);
  const { load, loading, hasMore } = usePagination({
    paginationSource: "channel",
    paginationKey: channelId,
    direction: "newer",
    loadFn: loadNewerMessages,
    extraParams,
  });

  return { loadNewer: load, loadingNewer: loading, hasNewer: hasMore };
}
