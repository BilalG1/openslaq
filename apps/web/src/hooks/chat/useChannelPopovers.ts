import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBookmarks, addBookmarkOp, removeBookmarkOp } from "@openslaq/client-core";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import { useChannelFiles } from "./useChannelFiles";
import { useOperationDeps } from "./useOperationDeps";

export function useChannelPopovers(workspaceSlug: string | undefined) {
  const deps = useOperationDeps();
  const { dispatch } = useChatStore();
  const { activeChannel } = useChatSelectors();
  const isGallery = useGalleryMode();
  const channelFiles = useChannelFiles(workspaceSlug);

  const [channelFilesOpen, setChannelFilesOpen] = useState(false);
  const [addBookmarkOpen, setAddBookmarkOpen] = useState(false);

  const openChannelFiles = useCallback(() => {
    if (isGallery || !activeChannel) return;
    setChannelFilesOpen(true);
    void channelFiles.loadFiles(activeChannel.id);
  }, [isGallery, activeChannel, channelFiles]);

  const closeChannelFiles = useCallback(() => {
    setChannelFilesOpen(false);
  }, []);

  const jumpToFileMessage = useCallback(
    (channelId: string, messageId: string) => {
      dispatch({ type: "workspace/selectChannel", channelId });
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: {
          channelId,
          messageId,
          highlightMessageId: messageId,
          parentMessageId: null,
        },
      });
    },
    [dispatch],
  );

  const openAddBookmark = useCallback(() => {
    setAddBookmarkOpen(true);
  }, []);

  const closeAddBookmark = useCallback(() => {
    setAddBookmarkOpen(false);
  }, []);

  const addBookmark = useCallback(
    (url: string, title: string) => {
      if (!workspaceSlug || !activeChannel) return;
      void addBookmarkOp(deps, { workspaceSlug, channelId: activeChannel.id, url, title });
    },
    [deps, workspaceSlug, activeChannel],
  );

  const removeBookmark = useCallback(
    (bookmarkId: string) => {
      if (!workspaceSlug || !activeChannel) return;
      void removeBookmarkOp(deps, { workspaceSlug, channelId: activeChannel.id, bookmarkId });
    },
    [deps, workspaceSlug, activeChannel],
  );

  // Close files popover when channel changes
  const prevChannelIdRef = useRef(activeChannel?.id);
  if (prevChannelIdRef.current !== activeChannel?.id) {
    prevChannelIdRef.current = activeChannel?.id;
    setChannelFilesOpen(false);
  }

  // Fetch bookmarks when channel changes
  useEffect(() => {
    if (isGallery || !workspaceSlug || !activeChannel) return;
    fetchBookmarks(deps, { workspaceSlug, channelId: activeChannel.id }).catch(() => {});
  }, [deps, isGallery, workspaceSlug, activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    channelFilesOpen,
    closeChannelFiles,
    openChannelFiles,
    channelFiles,
    jumpToFileMessage,
    addBookmarkOpen,
    openAddBookmark,
    closeAddBookmark,
    addBookmark,
    removeBookmark,
  };
}
