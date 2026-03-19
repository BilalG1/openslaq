import { useCallback } from "react";
import type { Channel, ChannelId, UserId } from "@openslaq/shared";
import {
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
  normalizeChannel,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../useCurrentUser";
import { useSocket } from "../useSocket";

export function useChannelMemberTracking(workspaceSlug?: string) {
  const { state, dispatch } = useChatStore();
  const user = useCurrentUser();
  const { socket } = useSocket();
  const auth = useAuthProvider();

  const onMemberAdded = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      dispatch({ type: "channel/memberCountDelta", channelId: String(payload.channelId), delta: 1 });
      if (!user || !workspaceSlug) return;
      const deps = { api, auth, dispatch, getState: () => state };
      void handleChannelMemberAdded(deps, {
        socket,
        channelId: payload.channelId,
        userId: payload.userId,
        currentUserId: user.id,
        workspaceSlug,
      });
    },
    [auth, dispatch, socket, state, user, workspaceSlug],
  );

  const onMemberRemoved = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      dispatch({ type: "channel/memberCountDelta", channelId: String(payload.channelId), delta: -1 });
      if (!user) return;
      handleChannelMemberRemoved(dispatch, {
        socket,
        channelId: payload.channelId,
        userId: payload.userId,
        currentUserId: user.id,
      });
    },
    [dispatch, socket, user],
  );

  const onChannelCreated = useCallback(
    (payload: { channel: Channel }) => {
      dispatch({
        type: "workspace/addChannel",
        channel: normalizeChannel(payload.channel as Parameters<typeof normalizeChannel>[0]),
      });
    },
    [dispatch],
  );

  const onChannelUpdated = useCallback(
    (payload: { channelId: ChannelId; channel: Channel }) => {
      dispatch({
        type: "workspace/updateChannel",
        channel: normalizeChannel(payload.channel as Parameters<typeof normalizeChannel>[0]),
      });
    },
    [dispatch],
  );

  useSocketEvent("channel:created", onChannelCreated);
  useSocketEvent("channel:updated", onChannelUpdated);
  useSocketEvent("channel:member-added", onMemberAdded);
  useSocketEvent("channel:member-removed", onMemberRemoved);
}
