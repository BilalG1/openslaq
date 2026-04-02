import { useRef } from "react";
import { loadChannelMessages } from "@openslaq/client-core";
import { useOperationDeps } from "./useOperationDeps";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import { useAsyncEffect } from "../useAsyncEffect";

export function useChannelMessages(
  workspaceSlug: string | undefined,
  channelId: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const deps = useOperationDeps();
  // Use a ref so the effect can read the latest value without re-firing when
  // scrollTarget is cleared (which would overwrite the "around" messages).
  const scrollTargetRef = useRef(state.scrollTarget);
  scrollTargetRef.current = state.scrollTarget;

  useAsyncEffect(
    async () => {
      // Skip fetching latest messages when a scrollTarget is active —
      // useScrollToMessage will load messages around the target instead.
      if (isGallery || !workspaceSlug || !channelId || scrollTargetRef.current) return;
      // Skip if messages are already loaded or currently loading (e.g. prefetched during bootstrap)
      if (state.channelMessageIds[channelId] || state.ui.channelMessagesLoading[channelId]) return;
      void loadChannelMessages(deps, { workspaceSlug, channelId });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channelId, dispatch, isGallery, deps, workspaceSlug],
  );
}
