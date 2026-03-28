import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import type { SocketStatus } from "@openslaq/client-core";
import type { Channel, ChannelId, CustomEmoji, EmojiId, HuddleState, Message, MessageId, UserId } from "@openslaq/shared";
import {
  bootstrapWorkspace,
  handlePresenceSync,
  handlePresenceUpdate,
  handleNewMessageUnread,
  markChannelAsRead,
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
  handleHuddleSync,
  handleHuddleStarted,
  handleHuddleUpdated,
  handleHuddleEnded,
  normalizeChannel,
  fetchSavedMessageIds,
} from "@openslaq/client-core";
import { useAuth } from "./AuthContext";
import { useChatStore } from "./ChatStoreProvider";
import { useSocket } from "./SocketProvider";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { useOperationDeps } from "../hooks/useOperationDeps";

const WorkspaceSlugContext = createContext<string>("");

export function useWorkspaceSlug(): string {
  return useContext(WorkspaceSlugContext);
}

interface Props {
  workspaceSlug: string;
  children: ReactNode;
}

export function WorkspaceBootstrapProvider({
  workspaceSlug,
  children,
}: Props) {
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const { socket, status: socketStatus } = useSocket();
  const router = useRouter();

  // Bootstrap workspace on mount
  useEffect(() => {
    if (!workspaceSlug) return;
    void bootstrapWorkspace(deps, { workspaceSlug });
  }, [dispatch, authProvider, workspaceSlug]);

  // Re-bootstrap when socket reconnects to sync missed data
  const prevSocketStatus = useRef<SocketStatus>(socketStatus);
  useEffect(() => {
    const prev = prevSocketStatus.current;
    prevSocketStatus.current = socketStatus;

    if (
      socketStatus === "connected" &&
      (prev === "reconnecting" || prev === "error" || prev === "disconnected") &&
      workspaceSlug
    ) {
      void bootstrapWorkspace(deps, { workspaceSlug });
    }
  }, [socketStatus, workspaceSlug, deps]);

  // Redirect to workspace list when bootstrap fails (e.g. invalid workspace slug)
  const bootstrapError = state.ui.bootstrapError;
  useEffect(() => {
    if (bootstrapError) {
      router.replace("/(app)/");
    }
  }, [bootstrapError, router]);

  // Fetch saved message IDs after bootstrap
  useEffect(() => {
    if (!workspaceSlug || state.ui.bootstrapLoading) return;
    void fetchSavedMessageIds(deps, { workspaceSlug }).then((ids) => {
      dispatch({ type: "saved/set", messageIds: ids });
    });
  }, [dispatch, authProvider, workspaceSlug, state.ui.bootstrapLoading]);

  // Presence tracking
  const onPresenceSync = useCallback(
    (payload: {
      users: Array<{
        userId: UserId;
        status: "online" | "offline";
        lastSeenAt: string | null;
      }>;
    }) => {
      dispatch(handlePresenceSync(payload));
    },
    [dispatch],
  );

  const onPresenceUpdated = useCallback(
    (payload: {
      userId: UserId;
      status: "online" | "offline";
      lastSeenAt: string | null;
    }) => {
      dispatch(handlePresenceUpdate(payload));
    },
    [dispatch],
  );

  useSocketEvent("presence:sync", onPresenceSync);
  useSocketEvent("presence:updated", onPresenceUpdated);

  // Unread tracking
  const onNewMessage = useCallback(
    (message: Message) => {
      if (!user) return;
      const activeId = state.activeChannelId ?? state.activeDmId ?? state.activeGroupDmId;
      // If viewing this channel, mark as read so the server cancels the pending push
      if (activeId && message.channelId === activeId && workspaceSlug) {
        void markChannelAsRead(deps, { workspaceSlug, channelId: activeId });
      }
      const action = handleNewMessageUnread(message, {
        currentUserId: user.id,
        activeChannelId: state.activeChannelId,
        activeDmId: state.activeDmId,
        activeGroupDmId: state.activeGroupDmId,
      });
      if (action) dispatch(action);
    },
    [state.activeChannelId, state.activeDmId, state.activeGroupDmId, dispatch, user, workspaceSlug, deps],
  );

  useSocketEvent("message:new", onNewMessage);

  // Mark-as-read when channel changes
  useEffect(() => {
    const channelId = state.activeChannelId ?? state.activeDmId ?? state.activeGroupDmId;
    if (!channelId || !workspaceSlug) return;
    void markChannelAsRead(deps, { workspaceSlug, channelId });
  }, [state.activeChannelId, state.activeDmId, state.activeGroupDmId, authProvider, dispatch, workspaceSlug]);

  // Channel member tracking
  const onMemberAdded = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      dispatch({ type: "channel/memberCountDelta", channelId: String(payload.channelId), delta: 1 });
      if (!user || !workspaceSlug) return;
        void handleChannelMemberAdded(deps, {
        socket,
        channelId: payload.channelId,
        userId: payload.userId,
        currentUserId: user.id,
        workspaceSlug,
      });
    },
    [authProvider, dispatch, socket, user, workspaceSlug],
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

  useSocketEvent("channel:member-added", onMemberAdded);
  useSocketEvent("channel:member-removed", onMemberRemoved);

  // Channel updated tracking
  const onChannelCreated = useCallback(
    (payload: { channel: Channel }) => {
      const channel = normalizeChannel(payload.channel as Parameters<typeof normalizeChannel>[0]);
      dispatch({ type: "workspace/addChannel", channel });
    },
    [dispatch],
  );

  const onChannelUpdated = useCallback(
    (payload: { channelId: ChannelId; channel: Channel }) => {
      const channel = normalizeChannel(payload.channel as Parameters<typeof normalizeChannel>[0]);
      dispatch({ type: "workspace/updateChannel", channel });
    },
    [dispatch],
  );

  useSocketEvent("channel:created", onChannelCreated);
  useSocketEvent("channel:updated", onChannelUpdated);

  // Thread summary tracking
  const onThreadUpdated = useCallback(
    (payload: {
      parentMessageId: MessageId;
      channelId: ChannelId;
      replyCount: number;
      latestReplyAt: string;
    }) => {
      dispatch({
        type: "messages/updateThreadSummary",
        channelId: payload.channelId,
        parentMessageId: payload.parentMessageId,
        replyCount: payload.replyCount,
        latestReplyAt: payload.latestReplyAt,
      });
    },
    [dispatch],
  );

  useSocketEvent("thread:updated", onThreadUpdated);

  // Huddle tracking
  const onHuddleSync = useCallback(
    (payload: { huddles: HuddleState[] }) => dispatch(handleHuddleSync(payload)),
    [dispatch],
  );

  const onHuddleStarted = useCallback(
    (huddle: HuddleState) => dispatch(handleHuddleStarted(huddle)),
    [dispatch],
  );

  const onHuddleUpdated = useCallback(
    (huddle: HuddleState) => dispatch(handleHuddleUpdated(huddle)),
    [dispatch],
  );

  const onHuddleEnded = useCallback(
    (payload: { channelId: ChannelId }) => dispatch(handleHuddleEnded(payload)),
    [dispatch],
  );

  useSocketEvent("huddle:sync", onHuddleSync);
  useSocketEvent("huddle:started", onHuddleStarted);
  useSocketEvent("huddle:updated", onHuddleUpdated);
  useSocketEvent("huddle:ended", onHuddleEnded);

  // Pin tracking
  const onMessagePinned = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; pinnedBy: UserId; pinnedAt: string }) => {
      dispatch({
        type: "messages/updatePinStatus",
        messageId: payload.messageId,
        isPinned: true,
        pinnedBy: payload.pinnedBy,
        pinnedAt: payload.pinnedAt,
      });
    },
    [dispatch],
  );

  const onMessageUnpinned = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId }) => {
      dispatch({
        type: "messages/updatePinStatus",
        messageId: payload.messageId,
        isPinned: false,
      });
    },
    [dispatch],
  );

  useSocketEvent("message:pinned", onMessagePinned);
  useSocketEvent("message:unpinned", onMessageUnpinned);

  // Custom emoji tracking
  const onEmojiAdded = useCallback(
    (payload: { emoji: CustomEmoji }) => {
      dispatch({ type: "emoji/add", emoji: payload.emoji });
    },
    [dispatch],
  );

  const onEmojiDeleted = useCallback(
    (payload: { emojiId: EmojiId }) => {
      dispatch({ type: "emoji/remove", emojiId: payload.emojiId });
    },
    [dispatch],
  );

  useSocketEvent("emoji:added", onEmojiAdded);
  useSocketEvent("emoji:deleted", onEmojiDeleted);

  // Don't render children when bootstrap has failed — we're redirecting
  if (bootstrapError) {
    return null;
  }

  return (
    <WorkspaceSlugContext.Provider value={workspaceSlug}>
      {children}
    </WorkspaceSlugContext.Provider>
  );
}
