import { describe, test, expect, jest, mock } from "bun:test";
import { renderHook } from "../../test-utils";

const mockDispatch = jest.fn();

mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { channels: [] }, dispatch: mockDispatch }),
}));

mock.module("../useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1" }),
}));

mock.module("../useSocket", () => ({
  useSocket: () => ({ socket: null }),
}));

const _realApiClient = require("../../lib/api-client");
mock.module("../../lib/api-client", () => ({
  ..._realApiClient,
  useAuthProvider: () => ({}),
}));

const socketHandlers: Record<string, Function> = {};
mock.module("../useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: Function) => {
    socketHandlers[event] = handler;
  },
}));

// Must import after mocks
const { useChannelMemberTracking } = await import("./useChannelMemberTracking");

describe("useChannelMemberTracking", () => {
  test("registers channel:created socket handler that dispatches addChannel", () => {
    renderHook(() => useChannelMemberTracking("test-workspace"));

    expect(socketHandlers["channel:created"]).toBeDefined();

    const channel = {
      id: "ch-1",
      name: "new-channel",
      type: "public",
      workspaceId: "ws-1",
      description: null,
      displayName: null,
      isArchived: false,
      createdBy: "user-2",
      createdAt: "2026-01-01T00:00:00Z",
      memberCount: 1,
    };

    socketHandlers["channel:created"]!({ channel });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "workspace/addChannel",
      channel: expect.objectContaining({ id: "ch-1", name: "new-channel" }),
    });
  });

  test("dispatches memberCountDelta on channel:member-added", () => {
    mockDispatch.mockClear();
    renderHook(() => useChannelMemberTracking("test-workspace"));

    expect(socketHandlers["channel:member-added"]).toBeDefined();
    socketHandlers["channel:member-added"]!({ channelId: "ch-1", userId: "user-2" });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "channel/memberCountDelta",
      channelId: "ch-1",
      delta: 1,
    });
  });

  test("dispatches memberCountDelta on channel:member-removed", () => {
    mockDispatch.mockClear();
    renderHook(() => useChannelMemberTracking("test-workspace"));

    expect(socketHandlers["channel:member-removed"]).toBeDefined();
    socketHandlers["channel:member-removed"]!({ channelId: "ch-1", userId: "user-2" });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "channel/memberCountDelta",
      channelId: "ch-1",
      delta: -1,
    });
  });

  test("registers channel:updated socket handler that dispatches updateChannel", () => {
    renderHook(() => useChannelMemberTracking("test-workspace"));

    expect(socketHandlers["channel:updated"]).toBeDefined();

    const channel = {
      id: "ch-1",
      name: "renamed-channel",
      type: "public",
      workspaceId: "ws-1",
      description: "updated",
      displayName: null,
      isArchived: false,
      createdBy: "user-2",
      createdAt: "2026-01-01T00:00:00Z",
      memberCount: 2,
    };

    socketHandlers["channel:updated"]!({ channelId: "ch-1", channel });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "workspace/updateChannel",
      channel: expect.objectContaining({ id: "ch-1", name: "renamed-channel" }),
    });
  });
});
