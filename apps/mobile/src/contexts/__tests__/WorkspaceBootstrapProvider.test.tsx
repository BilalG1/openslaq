import React from "react";
import { render } from "@testing-library/react-native";
import {
  bootstrapWorkspace,
  handlePresenceSync,
  handlePresenceUpdate,
  handleNewMessageUnread,
  markChannelAsRead,
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
} from "@openslaq/client-core";
import { WorkspaceBootstrapProvider } from "../WorkspaceBootstrapProvider";
import { useAuth } from "../AuthContext";
import { useChatStore } from "../ChatStoreProvider";
import { useSocket } from "../SocketProvider";
import { useSocketEvent } from "../../hooks/useSocketEvent";

jest.mock("@openslaq/client-core", () => ({
  createApiClient: jest.fn(() => ({ __api: "mock-api-client" })),
  bootstrapWorkspace: jest.fn(),
  handlePresenceSync: jest.fn(),
  handlePresenceUpdate: jest.fn(),
  handleNewMessageUnread: jest.fn(),
  markChannelAsRead: jest.fn(),
  handleChannelMemberAdded: jest.fn(),
  handleChannelMemberRemoved: jest.fn(),
  fetchSavedMessageIds: jest.fn(() => Promise.resolve([])),
  normalizeChannel: jest.fn((c: unknown) => c),
}));

jest.mock("../AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../ChatStoreProvider", () => ({
  useChatStore: jest.fn(),
}));

jest.mock("../SocketProvider", () => ({
  useSocket: jest.fn(),
}));

jest.mock("../../hooks/useSocketEvent", () => ({
  useSocketEvent: jest.fn(),
}));

const bootstrapWorkspaceMock = bootstrapWorkspace as jest.Mock;
const handlePresenceSyncMock = handlePresenceSync as jest.Mock;
const handlePresenceUpdateMock = handlePresenceUpdate as jest.Mock;
const handleNewMessageUnreadMock = handleNewMessageUnread as jest.Mock;
const markChannelAsReadMock = markChannelAsRead as jest.Mock;
const handleChannelMemberAddedMock = handleChannelMemberAdded as jest.Mock;
const handleChannelMemberRemovedMock = handleChannelMemberRemoved as jest.Mock;
const useAuthMock = useAuth as jest.Mock;
const useChatStoreMock = useChatStore as jest.Mock;
const useSocketMock = useSocket as jest.Mock;
const useSocketEventMock = useSocketEvent as jest.Mock;

describe("WorkspaceBootstrapProvider", () => {
  const dispatch = jest.fn();
  const authProvider = { getAccessToken: jest.fn() };
  const socket = { id: "socket-1" };
  const user = { id: "user-1" };
  const eventHandlers = new Map<string, (...args: unknown[]) => void>();

  const baseState = {
    activeChannelId: "channel-1",
    activeDmId: null,
    activeGroupDmId: null,
    ui: { bootstrapLoading: false },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventHandlers.clear();

    useAuthMock.mockReturnValue({ authProvider, user });
    useChatStoreMock.mockReturnValue({ state: baseState, dispatch });
    useSocketMock.mockReturnValue({ socket });
    useSocketEventMock.mockImplementation(
      (event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers.set(event, handler);
      },
    );
  });

  it("bootstraps workspace and marks active channel as read", () => {
    render(
      <WorkspaceBootstrapProvider workspaceSlug="acme">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    expect(bootstrapWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: authProvider,
        dispatch,
        getState: expect.any(Function),
      }),
      { workspaceSlug: "acme" },
    );

    expect(markChannelAsReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: authProvider,
        dispatch,
      }),
      { workspaceSlug: "acme", channelId: "channel-1" },
    );
  });

  it("does not bootstrap or mark as read when workspaceSlug is missing", () => {
    render(
      <WorkspaceBootstrapProvider workspaceSlug="">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    expect(bootstrapWorkspaceMock).not.toHaveBeenCalled();
    expect(markChannelAsReadMock).not.toHaveBeenCalled();
  });

  it("dispatches presence actions from socket events", () => {
    handlePresenceSyncMock.mockReturnValue({ type: "presence/sync" });
    handlePresenceUpdateMock.mockReturnValue({ type: "presence/update" });

    render(
      <WorkspaceBootstrapProvider workspaceSlug="acme">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    const presenceSyncPayload = {
      users: [{ userId: "user-2", status: "online", lastSeenAt: null }],
    };
    const presenceUpdatedPayload = {
      userId: "user-2",
      status: "offline",
      lastSeenAt: "2026-02-01T00:00:00.000Z",
    };

    eventHandlers.get("presence:sync")?.(presenceSyncPayload);
    eventHandlers.get("presence:updated")?.(presenceUpdatedPayload);

    expect(handlePresenceSyncMock).toHaveBeenCalledWith(presenceSyncPayload);
    expect(handlePresenceUpdateMock).toHaveBeenCalledWith(presenceUpdatedPayload);
    expect(dispatch).toHaveBeenCalledWith({ type: "presence/sync" });
    expect(dispatch).toHaveBeenCalledWith({ type: "presence/update" });
  });

  it("handles message:new unread action when user exists", () => {
    handleNewMessageUnreadMock.mockReturnValue({ type: "messages/unread" });

    render(
      <WorkspaceBootstrapProvider workspaceSlug="acme">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    const message = { id: "message-1", channelId: "channel-1" };
    eventHandlers.get("message:new")?.(message);

    expect(handleNewMessageUnreadMock).toHaveBeenCalledWith(
      message,
      {
        currentUserId: "user-1",
        activeChannelId: "channel-1",
        activeDmId: null,
        activeGroupDmId: null,
      },
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "messages/unread" });
  });

  it("skips unread tracking when no authenticated user exists", () => {
    useAuthMock.mockReturnValue({ authProvider, user: null });

    render(
      <WorkspaceBootstrapProvider workspaceSlug="acme">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    eventHandlers.get("message:new")?.({ id: "message-2" });

    expect(handleNewMessageUnreadMock).not.toHaveBeenCalled();
  });

  it("handles channel member events", () => {
    render(
      <WorkspaceBootstrapProvider workspaceSlug="acme">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    eventHandlers.get("channel:member-added")?.({ channelId: "channel-1", userId: "user-3" });
    eventHandlers.get("channel:member-removed")?.({ channelId: "channel-1", userId: "user-3" });

    expect(handleChannelMemberAddedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: authProvider,
        dispatch,
      }),
      {
        socket,
        channelId: "channel-1",
        userId: "user-3",
        currentUserId: "user-1",
        workspaceSlug: "acme",
      },
    );

    expect(handleChannelMemberRemovedMock).toHaveBeenCalledWith(
      dispatch,
      {
        socket,
        channelId: "channel-1",
        userId: "user-3",
        currentUserId: "user-1",
      },
    );
  });

  it("dispatches thread summary updates", () => {
    render(
      <WorkspaceBootstrapProvider workspaceSlug="acme">
        <></>
      </WorkspaceBootstrapProvider>,
    );

    eventHandlers.get("thread:updated")?.({
      parentMessageId: "parent-1",
      channelId: "channel-1",
      replyCount: 2,
      latestReplyAt: "2026-02-01T00:00:00.000Z",
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "messages/updateThreadSummary",
      channelId: "channel-1",
      parentMessageId: "parent-1",
      replyCount: 2,
      latestReplyAt: "2026-02-01T00:00:00.000Z",
    });
  });
});
