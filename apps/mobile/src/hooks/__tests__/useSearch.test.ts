import { renderHook, act } from "@testing-library/react-native";
import { searchMessages } from "@openslaq/client-core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SearchResultItem } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";
import { useSearch, loadRecentSearches, saveRecentSearch } from "../useSearch";

jest.mock("@openslaq/client-core", () => ({
  createApiClient: jest.fn(() => ({ __api: "mock-api-client" })),
  searchMessages: jest.fn(),
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

const mockAuthProvider = {
  getAccessToken: jest.fn(),
  requireAccessToken: jest.fn(),
  onAuthRequired: jest.fn(),
};

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: mockAuthProvider,
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      channels: [{ id: "ch-1", name: "general", type: "public" }],
      dms: [],
    },
  }),
}));

const searchMessagesMock = searchMessages as jest.Mock;

function makeResult(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    messageId: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    channelName: "general",
    channelType: "public",
    userId: asUserId("u-1"),
    userDisplayName: "User One",
    content: "hello world",
    headline: "<mark>hello</mark> world",
    parentMessageId: null,
    createdAt: "2025-01-01T00:00:00Z",
    rank: 1,
    ...overrides,
  };
}

describe("useSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces search calls (300ms)", async () => {
    searchMessagesMock.mockResolvedValue({ results: [], total: 0 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    // Not called yet (debouncing)
    expect(searchMessagesMock).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(1);
  });

  it("filter changes trigger new search after debounce", async () => {
    searchMessagesMock.mockResolvedValue({ results: [makeResult()], total: 1 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(1);

    // Change filter
    act(() => {
      result.current.updateFilters({ channelId: asChannelId("ch-1") });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(2);
  });

  it("loadMore calls API with offset+20 and appends results", async () => {
    const firstBatch = Array.from({ length: 20 }, (_, i) =>
      makeResult({ messageId: asMessageId(`msg-${i}`) }),
    );
    searchMessagesMock.mockResolvedValueOnce({ results: firstBatch, total: 25 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);

    const moreBatch = Array.from({ length: 5 }, (_, i) =>
      makeResult({ messageId: asMessageId(`msg-${20 + i}`) }),
    );
    searchMessagesMock.mockResolvedValueOnce({ results: moreBatch, total: 25 });

    await act(async () => {
      result.current.loadMore();
    });

    expect(searchMessagesMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ offset: 20 }),
    );
    expect(result.current.results).toHaveLength(25);
  });

  it("error from API sets error state", async () => {
    searchMessagesMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.error).toBe("Search failed");
    expect(result.current.results).toHaveLength(0);
  });

  it("reset clears filters, results, and aborts", async () => {
    searchMessagesMock.mockResolvedValue({ results: [makeResult()], total: 1 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.filters.q).toBe("");
    expect(result.current.results).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("empty query clears results without API call", async () => {
    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).not.toHaveBeenCalled();
    expect(result.current.results).toHaveLength(0);
  });

  it("returns channels and dms from chat store", () => {
    const { result } = renderHook(() => useSearch("test-ws"));

    expect(result.current.channels).toHaveLength(1);
    expect(result.current.channels[0]!.name).toBe("general");
    expect(result.current.dms).toHaveLength(0);
  });

  it("rapid filter changes only trigger one search (debounce resets)", async () => {
    searchMessagesMock.mockResolvedValue({ results: [], total: 0 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "a" });
    });
    act(() => {
      result.current.updateFilters({ q: "ab" });
    });
    act(() => {
      result.current.updateFilters({ q: "abc" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Only the last filter value should have triggered a search
    expect(searchMessagesMock).toHaveBeenCalledTimes(1);
    expect(searchMessagesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ q: "abc" }),
    );
  });

  it("error state is cleared on next successful search", async () => {
    searchMessagesMock.mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "bad" });
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.error).toBeTruthy();

    // Retry with a successful search
    searchMessagesMock.mockResolvedValueOnce({ results: [makeResult()], total: 1 });

    act(() => {
      result.current.updateFilters({ q: "good" });
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toHaveLength(1);
  });

  it("ignores stale search results when a newer search is in-flight", async () => {
    let resolveFirst: ((v: { results: SearchResultItem[]; total: number }) => void) | null = null;

    searchMessagesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result } = renderHook(() => useSearch("test-ws"));

    // Start first search
    act(() => {
      result.current.updateFilters({ q: "first" });
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(1);

    // Start second search before first resolves
    const secondResult = makeResult({ messageId: asMessageId("msg-second") });
    searchMessagesMock.mockResolvedValueOnce({ results: [secondResult], total: 1 });

    act(() => {
      result.current.updateFilters({ q: "second" });
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(2);

    // Now resolve the first (stale) search
    const staleResult = makeResult({ messageId: asMessageId("msg-stale") });
    await act(async () => {
      resolveFirst!({ results: [staleResult], total: 1 });
    });

    // Results should be from the second (newer) search, not the stale first
    expect(result.current.results[0]?.messageId).toBe("msg-second");
  });

  describe("recent searches", () => {
    beforeEach(async () => {
      await AsyncStorage.removeItem("openslaq-recent-searches");
    });

    it("saves a query to recent searches after a successful search", async () => {
      searchMessagesMock.mockResolvedValue({ results: [makeResult()], total: 1 });

      const { result } = renderHook(() => useSearch("test-ws"));

      act(() => {
        result.current.updateFilters({ q: "hello world" });
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Wait for async storage write
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.recentSearches).toContain("hello world");

      // Verify persisted
      const stored = await loadRecentSearches();
      expect(stored).toContain("hello world");
    });

    it("does not save a query when search returns no results", async () => {
      searchMessagesMock.mockResolvedValue({ results: [], total: 0 });

      const { result } = renderHook(() => useSearch("test-ws"));

      act(() => {
        result.current.updateFilters({ q: "nothing" });
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.recentSearches).toHaveLength(0);
    });

    it("loads recent searches on mount", async () => {
      await saveRecentSearch("previous query");

      const { result } = renderHook(() => useSearch("test-ws"));

      // Wait for the useEffect to load
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.recentSearches).toContain("previous query");
    });

    it("limits recent searches to 5 entries", async () => {
      for (let i = 1; i <= 6; i++) {
        await saveRecentSearch(`query ${i}`);
      }

      const stored = await loadRecentSearches();
      expect(stored).toHaveLength(5);
      // Most recent first
      expect(stored[0]).toBe("query 6");
      expect(stored).not.toContain("query 1");
    });

    it("deduplicates recent searches and moves repeated query to top", async () => {
      await saveRecentSearch("first");
      await saveRecentSearch("second");
      await saveRecentSearch("first"); // repeat

      const stored = await loadRecentSearches();
      expect(stored).toEqual(["first", "second"]);
    });

    it("exposes recentSearches from the hook after search", async () => {
      searchMessagesMock.mockResolvedValue({ results: [makeResult()], total: 1 });

      const { result } = renderHook(() => useSearch("test-ws"));

      // Initially empty
      expect(result.current.recentSearches).toEqual([]);

      act(() => {
        result.current.updateFilters({ q: "test query" });
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.recentSearches).toEqual(["test query"]);
    });
  });
});
