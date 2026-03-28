import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../test-utils";

const mockDispatch = vi.fn();
let mockActiveView = "unreads";

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { activeView: mockActiveView },
    dispatch: mockDispatch,
  }),
}));

vi.mock("../../lib/api-client", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  useAuthProvider: () => ({}),
  };
});

vi.mock("../../api", () => ({
  api: {},
}));

const mockFetchAllUnreads = vi.fn();
const mockMarkChannelAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  fetchAllUnreads: (...args: unknown[]) => mockFetchAllUnreads(...args),
  markChannelAsRead: (...args: unknown[]) => mockMarkChannelAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
  };
});

const socketHandlers: Record<string, Function> = {};
vi.mock("../useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: Function) => {
    socketHandlers[event] = handler;
  },
}));

import { useAllUnreads } from "./useAllUnreads";

describe("useAllUnreads", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockFetchAllUnreads.mockReset();
    mockMarkChannelAsRead.mockReset();
    mockMarkAllAsRead.mockReset();
    mockActiveView = "unreads";
  });

  test("fetches unreads when active and workspaceSlug provided", async () => {
    const mockData = { channels: [], threadMentions: [] };
    mockFetchAllUnreads.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAllUnreads("test-workspace"));

    // Wait for the async fetch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchAllUnreads).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
  });

  test("does not fetch when workspaceSlug is undefined", async () => {
    const { result } = renderHook(() => useAllUnreads(undefined));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchAllUnreads).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  test("does not fetch when view is not active", async () => {
    mockActiveView = "channel";

    renderHook(() => useAllUnreads("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchAllUnreads).not.toHaveBeenCalled();
  });

  test("sets error on fetch failure", async () => {
    mockFetchAllUnreads.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAllUnreads("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.loading).toBe(false);
  });

  test("sets fallback error for non-Error throws", async () => {
    mockFetchAllUnreads.mockRejectedValue("something went wrong");

    const { result } = renderHook(() => useAllUnreads("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.error).toBe("Failed to load unreads");
  });

  test("markChannelRead filters channel from data and dispatches unread/clear", async () => {
    const mockData = {
      channels: [
        { channelId: "ch-1", channelName: "general", messages: [] },
        { channelId: "ch-2", channelName: "random", messages: [] },
      ],
      threadMentions: [],
    };
    mockFetchAllUnreads.mockResolvedValue(mockData);
    mockMarkChannelAsRead.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAllUnreads("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.markChannelRead("ch-1");
    });

    expect(mockMarkChannelAsRead).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "unread/clear", channelId: "ch-1" });
    expect(result.current.data?.channels).toHaveLength(1);
    expect(String(result.current.data?.channels[0]?.channelId)).toBe("ch-2");
  });

  test("markAllRead clears all data", async () => {
    const mockData = {
      channels: [{ channelId: "ch-1", channelName: "general", messages: [] }],
      threadMentions: [],
    };
    mockFetchAllUnreads.mockResolvedValue(mockData);
    mockMarkAllAsRead.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAllUnreads("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockMarkAllAsRead).toHaveBeenCalled();
    expect(result.current.data).toEqual({ channels: [], threadMentions: [] });
  });
});
