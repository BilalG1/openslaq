import { useCallback } from "react";
import type { Channel, ChannelNotifyLevel } from "@openslaq/shared";
import {
  updateChannelDescription,
  archiveChannel,
  unarchiveChannel,
  leaveChannel,
  starChannelOp,
  unstarChannelOp,
  setChannelNotificationPrefOp,
} from "@openslaq/client-core";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { useOperationDeps } from "./useOperationDeps";
import { useSocket } from "../useSocket";

export function useChannelActions(workspaceSlug: string | undefined) {
  const deps = useOperationDeps();
  const { state, dispatch } = useChatStore();
  const { activeChannel } = useChatSelectors();
  const { socket } = useSocket();

  const updateDescription = useCallback(
    (description: string | null) => {
      if (!workspaceSlug || !activeChannel) return;
      void updateChannelDescription(deps, {
        workspaceSlug,
        channelId: activeChannel.id as Parameters<typeof updateChannelDescription>[1]["channelId"],
        description,
      });
    },
    [deps, workspaceSlug, activeChannel],
  );

  const archive = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    void archiveChannel(deps, {
      workspaceSlug,
      channelId: activeChannel.id as Parameters<typeof archiveChannel>[1]["channelId"],
    });
  }, [deps, workspaceSlug, activeChannel]);

  const unarchive = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    void unarchiveChannel(deps, {
      workspaceSlug,
      channelId: activeChannel.id as Parameters<typeof unarchiveChannel>[1]["channelId"],
    });
  }, [deps, workspaceSlug, activeChannel]);

  const toggleStar = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    const isStarred = state.starredChannelIds.includes(activeChannel.id);
    if (isStarred) {
      void unstarChannelOp(deps, { slug: workspaceSlug, channelId: activeChannel.id });
    } else {
      void starChannelOp(deps, { slug: workspaceSlug, channelId: activeChannel.id });
    }
  }, [deps, state.starredChannelIds, workspaceSlug, activeChannel]);

  const setNotificationLevel = useCallback(
    (channelId: string, level: ChannelNotifyLevel) => {
      if (!workspaceSlug) return;
      void setChannelNotificationPrefOp(deps, { slug: workspaceSlug, channelId, level });
    },
    [deps, workspaceSlug],
  );

  const leave = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    void leaveChannel(deps, {
      workspaceSlug,
      channelId: activeChannel.id as Parameters<typeof leaveChannel>[1]["channelId"],
      socket,
    });
  }, [deps, workspaceSlug, activeChannel, socket]);

  const onChannelCreated = useCallback(
    (channel: Channel) => {
      dispatch({ type: "workspace/addChannel", channel });
      dispatch({ type: "workspace/selectChannel", channelId: channel.id });
    },
    [dispatch],
  );

  return { updateDescription, archiveChannel: archive, unarchiveChannel: unarchive, leaveChannel: leave, toggleStar, setNotificationLevel, onChannelCreated };
}
