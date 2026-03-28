import { describe, test, expect, vi } from "vitest";
import { renderHook } from "../../test-utils";

const mockDispatch = vi.fn();
vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { channels: [] }, dispatch: mockDispatch }),
}));

vi.mock("../useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1" }),
}));

// Mock socket with on/off that captures handlers (used by the real useSocketEvent)
const socketHandlers: Record<string, Function> = {};
const mockSocket = {
  on: (event: string, handler: Function) => {
    socketHandlers[event] = handler;
  },
  off: () => {},
};

vi.mock("../useSocket", () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

vi.mock("../../lib/api-client", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  useAuthProvider: () => ({}),
  };
});

// Must import after mocks
import { useChannelMemberTracking } from "./useChannelMemberTracking";

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
