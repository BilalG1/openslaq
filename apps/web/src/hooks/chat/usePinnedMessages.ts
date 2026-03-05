import { useCallback, useEffect, useState } from "react";
import type { Message } from "@openslaq/shared";
import { pinMessageOp, unpinMessageOp, fetchPinnedMessages, fetchPinnedMessageCount } from "@openslaq/client-core";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import { useOperationDeps } from "./useOperationDeps";

export function usePinnedMessages(workspaceSlug: string | undefined) {
  const deps = useOperationDeps();
  const { dispatch } = useChatStore();
  const { activeChannel, currentChannelId } = useChatSelectors();
  const isGallery = useGalleryMode();

  const [pinsOpen, setPinsOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [pinnedCount, setPinnedCount] = useState(0);

  const pinMessage = useCallback(
    (messageId: string) => {
      if (!workspaceSlug || !currentChannelId) return;
      void pinMessageOp(deps, { workspaceSlug, channelId: currentChannelId, messageId });
      setPinnedCount((c) => c + 1);
    },
    [deps, workspaceSlug, currentChannelId],
  );

  const unpinMessage = useCallback(
    (messageId: string) => {
      if (!workspaceSlug || !currentChannelId) return;
      void unpinMessageOp(deps, { workspaceSlug, channelId: currentChannelId, messageId });
      setPinnedCount((c) => Math.max(0, c - 1));
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [deps, workspaceSlug, currentChannelId],
  );

  const openPins = useCallback(async () => {
    if (isGallery || !workspaceSlug || !activeChannel) return;
    setPinsOpen(true);
    setPinnedLoading(true);
    try {
      const msgs = await fetchPinnedMessages(deps, { workspaceSlug, channelId: activeChannel.id });
      setPinnedMessages(msgs);
      setPinnedCount(msgs.length);
    } catch {
      setPinnedMessages([]);
    } finally {
      setPinnedLoading(false);
    }
  }, [deps, isGallery, workspaceSlug, activeChannel]);

  const closePins = useCallback(() => {
    setPinsOpen(false);
  }, []);

  const jumpToPinnedMessage = useCallback(
    (messageId: string) => {
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: { messageId, highlightMessageId: messageId },
      });
    },
    [dispatch],
  );

  // Reset when channel changes
  useEffect(() => {
    setPinsOpen(false);
    setPinnedMessages([]);
    if (!activeChannel) setPinnedCount(0);
  }, [activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch lightweight count when channel changes (not full messages)
  useEffect(() => {
    if (isGallery || !workspaceSlug || !activeChannel) return;
    let cancelled = false;
    fetchPinnedMessageCount(deps, { workspaceSlug, channelId: activeChannel.id })
      .then((count) => {
        if (!cancelled) setPinnedCount(count);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [deps, isGallery, workspaceSlug, activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pinsOpen, pinnedMessages, pinnedLoading, pinnedCount, openPins, closePins, pinMessage, unpinMessage, jumpToPinnedMessage };
}
