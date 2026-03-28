import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../../test-utils";

const mockLoadFn = vi.fn();

vi.mock("react-router-dom", () => ({
  useParams: () => ({ workspaceSlug: "default" }),
}));

vi.mock("../../../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
}));

const mockDeps = { api: {}, auth: {}, dispatch: vi.fn(), getState: vi.fn() };
vi.mock("../useOperationDeps", () => ({
  useOperationDeps: () => mockDeps,
}));

const mockState = {
  channelPagination: {} as Record<string, Record<string, unknown>>,
  threadPagination: {} as Record<string, Record<string, unknown>>,
};

vi.mock("../../../state/chat-store", () => ({
  useChatStore: () => ({ state: mockState, dispatch: vi.fn() }),
}));

import { usePagination } from "../usePagination";

describe("usePagination", () => {
  beforeEach(() => {
    mockLoadFn.mockClear();
    mockState.channelPagination = {};
    mockState.threadPagination = {};
  });

  test("returns loading=false and hasMore=false when no pagination state", () => {
    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "channel",
        paginationKey: "ch-1",
        direction: "older",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1" },
      }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(false);
  });

  test("returns correct state from channel pagination", () => {
    mockState.channelPagination["ch-1"] = {
      hasOlder: true,
      loadingOlder: false,
      olderCursor: "cursor-abc",
    };

    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "channel",
        paginationKey: "ch-1",
        direction: "older",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1" },
      }),
    );

    expect(result.current.hasMore).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test("calls loadFn with deps and merged params", async () => {
    mockState.channelPagination["ch-1"] = {
      hasOlder: true,
      loadingOlder: false,
      olderCursor: "cursor-abc",
    };

    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "channel",
        paginationKey: "ch-1",
        direction: "older",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1" },
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(mockLoadFn).toHaveBeenCalledWith(mockDeps, {
      workspaceSlug: "default",
      cursor: "cursor-abc",
      channelId: "ch-1",
    });
  });

  test("does not call loadFn when loading", async () => {
    mockState.channelPagination["ch-1"] = {
      hasOlder: true,
      loadingOlder: true,
      olderCursor: "cursor-abc",
    };

    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "channel",
        paginationKey: "ch-1",
        direction: "older",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1" },
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(mockLoadFn).not.toHaveBeenCalled();
  });

  test("does not call loadFn when hasMore is false", async () => {
    mockState.channelPagination["ch-1"] = {
      hasOlder: false,
      loadingOlder: false,
      olderCursor: "cursor-abc",
    };

    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "channel",
        paginationKey: "ch-1",
        direction: "older",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1" },
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(mockLoadFn).not.toHaveBeenCalled();
  });

  test("reads newer direction from channel pagination", () => {
    mockState.channelPagination["ch-1"] = {
      hasNewer: true,
      loadingNewer: true,
      newerCursor: "cursor-newer",
    };

    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "channel",
        paginationKey: "ch-1",
        direction: "newer",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1" },
      }),
    );

    expect(result.current.hasMore).toBe(true);
    expect(result.current.loading).toBe(true);
  });

  test("reads from thread pagination when source is thread", () => {
    mockState.threadPagination["parent-1"] = {
      hasOlder: true,
      loadingOlder: false,
      olderCursor: "thread-cursor",
    };

    const { result } = renderHook(() =>
      usePagination({
        paginationSource: "thread",
        paginationKey: "parent-1",
        direction: "older",
        loadFn: mockLoadFn,
        extraParams: { channelId: "ch-1", parentMessageId: "parent-1" },
      }),
    );

    expect(result.current.hasMore).toBe(true);
  });
});
