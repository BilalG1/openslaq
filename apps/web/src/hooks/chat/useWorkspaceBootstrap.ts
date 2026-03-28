import { useEffect, useRef } from "react";
import { bootstrapWorkspace } from "@openslaq/client-core";
import type { SocketStatus } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import { useSocket } from "../useSocket";

export function useWorkspaceBootstrap(
  workspaceSlug?: string,
  urlChannelId?: string,
  urlDmChannelId?: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();
  const { status } = useSocket();
  const prevStatusRef = useRef<SocketStatus>(status);

  useEffect(() => {
    if (isGallery || !workspaceSlug) return;

    const deps = { api, auth, dispatch, getState: () => state };
    void bootstrapWorkspace(deps, { workspaceSlug, urlChannelId, urlDmChannelId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isGallery, auth, workspaceSlug]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (isGallery || !workspaceSlug) return;
    if (status === "connected" && (prev === "reconnecting" || prev === "error")) {
      const deps = { api, auth, dispatch, getState: () => state };
      void bootstrapWorkspace(deps, { workspaceSlug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dispatch, isGallery, auth, workspaceSlug]);
}
