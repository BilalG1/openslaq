import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useViewRouteSync(
  workspaceSlug: string | undefined,
  urlChannelId: string | undefined,
  urlDmChannelId: string | undefined,
) {
  const navigate = useNavigate();
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  // Deep-link support: URL → store sync
  useEffect(() => {
    if (isGallery || state.ui.bootstrapLoading || !workspaceSlug) return;
    if (window.location.pathname.endsWith("/unreads") && state.activeView !== "unreads") {
      dispatch({ type: "workspace/selectUnreadsView" });
    }
    if (window.location.pathname.endsWith("/saved") && state.activeView !== "saved") {
      dispatch({ type: "workspace/selectSavedView" });
    }
    if (window.location.pathname.endsWith("/scheduled") && state.activeView !== "scheduled") {
      dispatch({ type: "workspace/selectScheduledView" });
    }
    if (window.location.pathname.endsWith("/files") && state.activeView !== "files") {
      dispatch({ type: "workspace/selectFilesView" });
    }
  }, [isGallery, state.ui.bootstrapLoading, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Store → URL sync (store is source of truth)
  useEffect(() => {
    if (isGallery || state.ui.bootstrapLoading || !workspaceSlug) return;
    const base = `/w/${workspaceSlug}`;
    if (state.activeView === "unreads") {
      const target = `${base}/unreads`;
      if (!window.location.pathname.endsWith("/unreads")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeView === "saved") {
      const target = `${base}/saved`;
      if (!window.location.pathname.endsWith("/saved")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeView === "scheduled") {
      const target = `${base}/scheduled`;
      if (!window.location.pathname.endsWith("/scheduled")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeView === "files") {
      const target = `${base}/files`;
      if (!window.location.pathname.endsWith("/files")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeGroupDmId) {
      const target = `${base}/dm/${state.activeGroupDmId}`;
      if (urlDmChannelId !== state.activeGroupDmId) {
        navigate(target, { replace: true });
      }
    } else if (state.activeDmId) {
      const target = `${base}/dm/${state.activeDmId}`;
      if (urlDmChannelId !== state.activeDmId) {
        navigate(target, { replace: true });
      }
    } else if (state.activeChannelId) {
      const target = `${base}/c/${state.activeChannelId}`;
      if (urlChannelId !== state.activeChannelId) {
        navigate(target, { replace: true });
      }
    }
  }, [isGallery, state.activeView, state.activeChannelId, state.activeDmId, state.activeGroupDmId, state.ui.bootstrapLoading, workspaceSlug, urlChannelId, urlDmChannelId, navigate]);
}
