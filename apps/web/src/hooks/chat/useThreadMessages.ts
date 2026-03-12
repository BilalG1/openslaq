import { loadThreadMessages } from "@openslaq/client-core";
import { useOperationDeps } from "./useOperationDeps";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import { useAsyncEffect } from "../useAsyncEffect";

export function useThreadMessages(
  workspaceSlug: string | undefined,
  channelId: string,
  parentMessageId: string,
) {
  const { dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const deps = useOperationDeps();

  useAsyncEffect(
    async () => {
      if (isGallery || !workspaceSlug || !channelId || !parentMessageId) return;
      void loadThreadMessages(deps, { workspaceSlug, channelId, parentMessageId });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channelId, dispatch, isGallery, parentMessageId, deps, workspaceSlug],
  );
}
