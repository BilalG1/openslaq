import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../test-utils";
import type { ScheduledMessageItem } from "@openslaq/client-core";
import type { ScheduledMessageId, ChannelId, UserId } from "@openslaq/shared";

const mockDispatch = vi.fn();
let mockActiveView = "outbox";

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

const mockFetchScheduledMessages = vi.fn();
const mockFetchScheduledCountForChannel = vi.fn();

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  fetchScheduledMessages: (...args: unknown[]) => mockFetchScheduledMessages(...args),
  fetchScheduledCountForChannel: (...args: unknown[]) => mockFetchScheduledCountForChannel(...args),
  };
});

const socketHandlers: Record<string, Function> = {};
vi.mock("../useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: Function) => {
    socketHandlers[event] = handler;
  },
}));

import {  useScheduledMessages, useScheduledCountForChannel  } from "./useScheduledMessages";

describe("useScheduledMessages", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockFetchScheduledMessages.mockReset();
    mockFetchScheduledCountForChannel.mockReset();
    mockActiveView = "outbox";
    for (const key of Object.keys(socketHandlers)) {
      delete socketHandlers[key];
    }
  });

  test("fetches when active (activeView=outbox) and workspaceSlug provided", async () => {
    const mockData: ScheduledMessageItem[] = [
      {
        id: "sm-1" as ScheduledMessageId,
        channelId: "ch-1" as ChannelId,
        userId: "u-1" as UserId,
        content: "hello",
        attachmentIds: [],
        scheduledFor: "2026-03-20T10:00:00Z",
        status: "pending",
        failureReason: null,
        sentMessageId: null,
        createdAt: "2026-03-18T00:00:00Z",
        updatedAt: "2026-03-18T00:00:00Z",
        channelName: "general",
      },
    ];
    mockFetchScheduledMessages.mockResolvedValue(mockData);

    const { result } = renderHook(() => useScheduledMessages("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchScheduledMessages).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("does not fetch when inactive", async () => {
    mockActiveView = "channel";

    renderHook(() => useScheduledMessages("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchScheduledMessages).not.toHaveBeenCalled();
  });

  test("does not fetch when workspaceSlug is undefined", async () => {
    const { result } = renderHook(() => useScheduledMessages(undefined));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchScheduledMessages).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  test("removeItem filters out item from data", async () => {
    const mockData: ScheduledMessageItem[] = [
      {
        id: "sm-1" as ScheduledMessageId,
        channelId: "ch-1" as ChannelId,
        userId: "u-1" as UserId,
        content: "hello",
        attachmentIds: [],
        scheduledFor: "2026-03-20T10:00:00Z",
        status: "pending",
        failureReason: null,
        sentMessageId: null,
        createdAt: "2026-03-18T00:00:00Z",
        updatedAt: "2026-03-18T00:00:00Z",
        channelName: "general",
      },
      {
        id: "sm-2" as ScheduledMessageId,
        channelId: "ch-2" as ChannelId,
        userId: "u-1" as UserId,
        content: "world",
        attachmentIds: [],
        scheduledFor: "2026-03-21T10:00:00Z",
        status: "pending",
        failureReason: null,
        sentMessageId: null,
        createdAt: "2026-03-18T00:00:00Z",
        updatedAt: "2026-03-18T00:00:00Z",
        channelName: "random",
      },
    ];
    mockFetchScheduledMessages.mockResolvedValue(mockData);

    const { result } = renderHook(() => useScheduledMessages("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.data).toHaveLength(2);

    act(() => {
      result.current.removeItem("sm-1" as ScheduledMessageId);
    });

    expect(result.current.data).toHaveLength(1);
    expect(String(result.current.data![0]!.id)).toBe("sm-2");
  });

  test("updateItem merges updates into matching item", async () => {
    const mockData: ScheduledMessageItem[] = [
      {
        id: "sm-1" as ScheduledMessageId,
        channelId: "ch-1" as ChannelId,
        userId: "u-1" as UserId,
        content: "hello",
        attachmentIds: [],
        scheduledFor: "2026-03-20T10:00:00Z",
        status: "pending",
        failureReason: null,
        sentMessageId: null,
        createdAt: "2026-03-18T00:00:00Z",
        updatedAt: "2026-03-18T00:00:00Z",
        channelName: "general",
      },
      {
        id: "sm-2" as ScheduledMessageId,
        channelId: "ch-2" as ChannelId,
        userId: "u-1" as UserId,
        content: "world",
        attachmentIds: [],
        scheduledFor: "2026-03-21T10:00:00Z",
        status: "pending",
        failureReason: null,
        sentMessageId: null,
        createdAt: "2026-03-18T00:00:00Z",
        updatedAt: "2026-03-18T00:00:00Z",
        channelName: "random",
      },
    ];
    mockFetchScheduledMessages.mockResolvedValue(mockData);

    const { result } = renderHook(() => useScheduledMessages("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      result.current.updateItem("sm-1", { content: "updated" } as Partial<ScheduledMessageItem>);
    });

    expect(result.current.data![0]!.content).toBe("updated");
    expect(result.current.data![1]!.content).toBe("world");
  });

  test("sets error on fetch failure", async () => {
    mockFetchScheduledMessages.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useScheduledMessages("test-workspace"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  test("loading state transitions (true during fetch, false after)", async () => {
    let resolveFetch!: (value: unknown[]) => void;
    mockFetchScheduledMessages.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
    );

    const { result } = renderHook(() => useScheduledMessages("test-workspace"));

    // Give effect time to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveFetch([]);
    });

    expect(result.current.loading).toBe(false);
  });
});

describe("useScheduledCountForChannel", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockFetchScheduledMessages.mockReset();
    mockFetchScheduledCountForChannel.mockReset();
    mockActiveView = "channel";
    for (const key of Object.keys(socketHandlers)) {
      delete socketHandlers[key];
    }
  });

  test("fetches count on mount when channelId and workspaceSlug provided", async () => {
    mockFetchScheduledCountForChannel.mockResolvedValue(5);

    const { result } = renderHook(() =>
      useScheduledCountForChannel("ch-1", "test-workspace"),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchScheduledCountForChannel).toHaveBeenCalled();
    expect(result.current.count).toBe(5);
  });

  test("returns 0 when channelId is undefined", async () => {
    const { result } = renderHook(() =>
      useScheduledCountForChannel(undefined, "test-workspace"),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchScheduledCountForChannel).not.toHaveBeenCalled();
    expect(result.current.count).toBe(0);
  });

  test("returns 0 on fetch error", async () => {
    mockFetchScheduledCountForChannel.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() =>
      useScheduledCountForChannel("ch-1", "test-workspace"),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.count).toBe(0);
  });

  test("socket events trigger refresh", async () => {
    mockFetchScheduledCountForChannel.mockResolvedValue(2);

    renderHook(() =>
      useScheduledCountForChannel("ch-1", "test-workspace"),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(socketHandlers["scheduledMessage:created"]).toBeDefined();
    expect(socketHandlers["scheduledMessage:deleted"]).toBeDefined();
    expect(socketHandlers["scheduledMessage:sent"]).toBeDefined();

    mockFetchScheduledCountForChannel.mockResolvedValue(3);

    await act(async () => {
      socketHandlers["scheduledMessage:created"]!();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetchScheduledCountForChannel).toHaveBeenCalledTimes(2);
  });
});
