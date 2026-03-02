import { useEffect, useRef } from "react";
import { useCurrentUser } from "../useCurrentUser";
import { useGalleryMode } from "../../gallery/gallery-context";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import type { Message } from "@openslaq/shared";

export function useScrollToMessage(
  currentChannelId: string | null,
  workspaceSlug: string | undefined,
) {
  const user = useCurrentUser();
  const isGallery = useGalleryMode();
  const { state, dispatch } = useChatStore();
  const scrollTarget = state.scrollTarget;
  const processingRef = useRef(false);

  useEffect(() => {
    if (isGallery) return;
    if (!scrollTarget || !currentChannelId || !workspaceSlug || !user || processingRef.current) return;

    let cancelled = false;
    let rafId: number | undefined;

    async function handleScrollTarget() {
      if (!scrollTarget || !currentChannelId || !workspaceSlug || !user) return;
      processingRef.current = true;

      const { messageId, highlightMessageId } = scrollTarget;

      // Check if the message is already loaded
      const isLoaded = state.channelMessageIds[currentChannelId]?.includes(messageId);

      if (!isLoaded) {
        // Fetch messages around the target
        try {
          const response = await authorizedRequest(user, (headers) =>
            api.api.workspaces[":slug"].channels[":id"].messages.around[":messageId"].$get(
              { param: { slug: workspaceSlug, id: currentChannelId, messageId } },
              { headers },
            ),
          );
          if (cancelled) { processingRef.current = false; return; }
          const data = (await response.json()) as {
            messages: Message[];
            targetFound: boolean;
            olderCursor: string | null;
            newerCursor: string | null;
            hasOlder: boolean;
            hasNewer: boolean;
          };
          if (data.targetFound) {
            dispatch({
              type: "channel/setMessages",
              channelId: currentChannelId,
              messages: data.messages,
              olderCursor: data.olderCursor,
              newerCursor: data.newerCursor,
              hasOlder: data.hasOlder,
              hasNewer: data.hasNewer,
            });
          }
        } catch {
          if (!cancelled) dispatch({ type: "navigation/clearScrollTarget" });
          processingRef.current = false;
          return;
        }
      }

      if (cancelled) { processingRef.current = false; return; }

      // Poll for the element — React may need several frames to render after dispatch
      let attempts = 0;
      const poll = () => {
        if (cancelled) { processingRef.current = false; return; }
        const el = document.querySelector(`[data-message-id="${highlightMessageId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("highlight-fade");
          setTimeout(() => {
            el.classList.remove("highlight-fade");
          }, 2000);
          dispatch({ type: "navigation/clearScrollTarget" });
          processingRef.current = false;
        } else if (attempts < 30) {
          attempts++;
          rafId = requestAnimationFrame(poll);
        } else {
          dispatch({ type: "navigation/clearScrollTarget" });
          processingRef.current = false;
        }
      };
      rafId = requestAnimationFrame(poll);
    }

    void handleScrollTarget();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [isGallery, scrollTarget, currentChannelId, workspaceSlug, user, state.channelMessageIds, dispatch]);
}
