import { useCallback } from "react";
import type { Channel, ChannelId, UserId } from "@openslaq/shared";
import {
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
  normalizeChannel,
  normalizeDmConversation,
  normalizeGroupDmConversation,
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

  const onDmCreated = useCallback(
    (payload: { channel: Channel; otherUser: { id: UserId; displayName: string; avatarUrl: string | null } }) => {
      dispatch({
        type: "workspace/addDm",
        dm: normalizeDmConversation(payload as Parameters<typeof normalizeDmConversation>[0]),
      });
      socket?.emit("channel:join", { channelId: payload.channel.id as ChannelId });
    },
    [dispatch, socket],
  );

  const onGroupDmCreated = useCallback(
    (payload: { channel: Channel; members: { id: string; displayName: string; avatarUrl: string | null }[] }) => {
      dispatch({
        type: "workspace/addGroupDm",
        groupDm: normalizeGroupDmConversation(payload as Parameters<typeof normalizeGroupDmConversation>[0]),
      });
      socket?.emit("channel:join", { channelId: payload.channel.id as ChannelId });
    },
    [dispatch, socket],
  );

  useSocketEvent("channel:created", onChannelCreated);
  useSocketEvent("channel:updated", onChannelUpdated);
  useSocketEvent("channel:member-added", onMemberAdded);
  useSocketEvent("channel:member-removed", onMemberRemoved);
  useSocketEvent("dm:created", onDmCreated);
  useSocketEvent("group-dm:created", onGroupDmCreated);
}
