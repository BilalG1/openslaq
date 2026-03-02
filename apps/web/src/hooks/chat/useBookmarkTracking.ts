import { useCallback } from "react";
import type { ChannelBookmark, ChannelId } from "@openslaq/shared";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";

export function useBookmarkTracking() {
  const { dispatch } = useChatStore();

  const onAdded = useCallback(
    (payload: { bookmark: ChannelBookmark }) => {
      dispatch({ type: "bookmarks/add", bookmark: payload.bookmark });
    },
    [dispatch],
  );

  const onRemoved = useCallback(
    (payload: { channelId: ChannelId; bookmarkId: string }) => {
      dispatch({ type: "bookmarks/remove", channelId: payload.channelId, bookmarkId: payload.bookmarkId });
    },
    [dispatch],
  );

  useSocketEvent("bookmark:added", onAdded);
  useSocketEvent("bookmark:removed", onRemoved);
}
