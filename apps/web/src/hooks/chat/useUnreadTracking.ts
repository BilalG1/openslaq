import { useCallback, useEffect } from "react";
import type { Message } from "@openslaq/shared";
import { handleNewMessageUnread, markChannelAsRead } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

interface AuthJsonUser {
  id: string;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useUnreadTracking(user: AuthJsonUser | null | undefined, workspaceSlug?: string) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();

  const onNewMessage = useCallback(
    (message: Message) => {
      if (!user) return;
      const activeId = state.activeChannelId ?? state.activeDmId;
      // If viewing this channel, mark as read so the server cancels the pending push
      if (activeId && message.channelId === activeId && workspaceSlug) {
        const deps = { api, auth, dispatch, getState: () => state };
        void markChannelAsRead(deps, { workspaceSlug, channelId: activeId });
      }
      const action = handleNewMessageUnread(message, {
        currentUserId: user.id,
        activeChannelId: state.activeChannelId,
        activeDmId: state.activeDmId,
        channelNotificationPrefs: state.channelNotificationPrefs,
      });
      if (action) dispatch(action);
    },
    [state, dispatch, user, workspaceSlug, auth],
  );

  useSocketEvent("message:new", onNewMessage);

  // Mark-as-read when user views a channel/DM
  const activeChannelId = state.activeChannelId;
  const activeDmId = state.activeDmId;
  const markedUnreadChannelId = state.markedUnreadChannelId;

  useEffect(() => {
    if (isGallery) return;
    const channelId = activeChannelId ?? activeDmId;
    if (!channelId || !workspaceSlug) return;

    // Suppress auto-mark-as-read if user just marked this channel as unread
    if (channelId === markedUnreadChannelId) return;

    const deps = { api, auth, dispatch, getState: () => state };
    void markChannelAsRead(deps, { workspaceSlug, channelId });
  }, [activeChannelId, activeDmId, auth, dispatch, isGallery, markedUnreadChannelId, state, workspaceSlug]);
}
