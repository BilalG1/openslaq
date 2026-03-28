import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../test-utils";
import type { ChannelId, MessageId, UserId, WorkspaceId } from "@openslaq/shared";
import type { Message, Channel } from "@openslaq/shared";
import type { DmConversation } from "../../state/chat-store";

// --- helpers for branded IDs ---
const chId = (s: string) => s as ChannelId;
const msgId = (s: string) => s as MessageId;
const usrId = (s: string) => s as UserId;
const wsId = (s: string) => s as WorkspaceId;

// --- mock state ---
let mockChannels: Channel[] = [];
let mockDms: DmConversation[] = [];
let mockMessagesById: Record<string, Message> = {};

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: {
      channels: mockChannels,
      dms: mockDms,
      groupDms: [],
      messagesById: mockMessagesById,
    },
    dispatch: vi.fn(),
  }),
}));

let mockIsGallery = false;
let mockGalleryMockData: unknown = null;

vi.mock("../../gallery/gallery-context", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  useGalleryMode: () => mockIsGallery,
  useGalleryMockData: () => mockGalleryMockData,
  };
});

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

const mockSearchMessages = vi.fn();

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  searchMessages: (...args: unknown[]) => mockSearchMessages(...args),
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error && err.message.trim().length > 0 ? err.message : fallback,
  };
});

import { useSearch } from "./useSearch";

// --- test data factories ---
function makeMessage(overrides: Partial<Message> & { id: MessageId; channelId: ChannelId; content: string }): Message {
  return {
    userId: usrId("user-1"),
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Message;
}

function makeChannel(id: string, name: string, type: "public" | "private" = "public"): Channel {
  return {
    id: chId(id),
    workspaceId: wsId("ws-1"),
    name,
    type,
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function makeDm(channelId: string, displayName: string): DmConversation {
  return {
    channel: {
      id: chId(channelId),
      workspaceId: wsId("ws-1"),
      name: `dm-${channelId}`,
      type: "dm" as const,
      description: null,
      displayName: null,
      isArchived: false,
      createdBy: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    otherUser: { id: usrId("other-1"), displayName, avatarUrl: null },
    lastMessageContent: null,
    lastMessageAt: null,
  };
}

// --- tests ---
describe("useSearch", () => {
  beforeEach(() => {
    mockSearchMessages.mockReset();
    mockIsGallery = false;
    mockGalleryMockData = null;
    mockChannels = [];
    mockDms = [];
    mockMessagesById = {};
  });

  // -------------------------------------------------------
  // Basic non-gallery (API) mode
  // -------------------------------------------------------
  describe("API mode", () => {
    test("debounces search by 300ms", async () => {
      mockSearchMessages.mockResolvedValue({ results: [], total: 0 });
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello" }));

      // Should not have called yet
      expect(mockSearchMessages).not.toHaveBeenCalled();

      // Wait 350ms for the debounce
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(mockSearchMessages).toHaveBeenCalledTimes(1);
    });

    test("empty query clears results without API call", async () => {
      mockSearchMessages.mockResolvedValue({
        results: [{ messageId: "m1", content: "x" }],
        total: 1,
      });
      const { result } = renderHook(() => useSearch("ws"));

      // First search with a real query
      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
      expect(result.current.results).toHaveLength(1);

      // Now clear query
      mockSearchMessages.mockClear();
      act(() => result.current.updateFilters({ q: "  " }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(mockSearchMessages).not.toHaveBeenCalled();
      expect(result.current.results).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    test("sets error on API failure", async () => {
      mockSearchMessages.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "fail" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
    });

    test("sets fallback error message for non-Error throws", async () => {
      mockSearchMessages.mockRejectedValue("oops");
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "fail" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.error).toBe("Search failed");
    });

    test("loadMore appends results", async () => {
      const page1 = Array.from({ length: 20 }, (_, i) => ({
        messageId: `m${i}`,
        content: `msg ${i}`,
      }));
      mockSearchMessages.mockResolvedValueOnce({ results: page1, total: 25 });

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "msg" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(20);
      expect(result.current.hasMore).toBe(true);

      const page2 = Array.from({ length: 5 }, (_, i) => ({
        messageId: `m${20 + i}`,
        content: `msg ${20 + i}`,
      }));
      mockSearchMessages.mockResolvedValueOnce({ results: page2, total: 25 });

      await act(async () => {
        result.current.loadMore();
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(result.current.results).toHaveLength(25);
      expect(result.current.hasMore).toBe(false);
    });

    test("loadMore does nothing when already at total", async () => {
      mockSearchMessages.mockResolvedValueOnce({
        results: [{ messageId: "m1", content: "x" }],
        total: 1,
      });

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "x" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.hasMore).toBe(false);
      mockSearchMessages.mockClear();

      act(() => result.current.loadMore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockSearchMessages).not.toHaveBeenCalled();
    });

    test("reset clears all state", async () => {
      mockSearchMessages.mockResolvedValue({
        results: [{ messageId: "m1", content: "hi" }],
        total: 1,
      });

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hi" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);

      act(() => result.current.reset());

      expect(result.current.results).toHaveLength(0);
      expect(result.current.total).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.filters.q).toBe("");
    });

    test("does nothing when workspaceSlug is undefined", async () => {
      const { result } = renderHook(() => useSearch(undefined));

      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(mockSearchMessages).not.toHaveBeenCalled();
      expect(result.current.results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // Gallery mode - in-memory filtering
  // -------------------------------------------------------
  describe("gallery mode", () => {
    beforeEach(() => {
      mockIsGallery = true;
      mockChannels = [
        makeChannel("ch-1", "general"),
        makeChannel("ch-2", "random", "private"),
      ];
      mockDms = [makeDm("dm-1", "Alice")];
      mockMessagesById = {
        "m1": makeMessage({ id: msgId("m1"), channelId: chId("ch-1"), content: "Hello world", senderDisplayName: "Bob", createdAt: "2026-01-03T00:00:00Z" }),
        "m2": makeMessage({ id: msgId("m2"), channelId: chId("ch-1"), content: "Goodbye world", senderDisplayName: "Carol", createdAt: "2026-01-02T00:00:00Z" }),
        "m3": makeMessage({ id: msgId("m3"), channelId: chId("ch-2"), content: "hello again", senderDisplayName: "Dave", createdAt: "2026-01-01T00:00:00Z" }),
        "m4": makeMessage({ id: msgId("m4"), channelId: chId("dm-1"), content: "Direct hello", senderDisplayName: "Alice", createdAt: "2026-01-04T00:00:00Z" }),
      };
    });

    test("filters messages by case-insensitive content match", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      // m1 ("Hello world"), m3 ("hello again"), m4 ("Direct hello") match
      expect(result.current.results).toHaveLength(3);
      expect(result.current.total).toBe(3);
      const ids = result.current.results.map((r) => String(r.messageId));
      expect(ids).toContain("m1");
      expect(ids).toContain("m3");
      expect(ids).toContain("m4");
    });

    test("matches against senderDisplayName", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "Carol" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);
      expect(String(result.current.results[0]!.messageId)).toBe("m2");
    });

    test("resolves channel name from channels list", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "Hello world" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      const match = result.current.results.find((r) => String(r.messageId) === "m1");
      expect(match?.channelName).toBe("general");
      expect(match?.channelType).toBe("public");
    });

    test("resolves channel name from DMs via otherUser.displayName", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "Direct hello" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0]!.channelName).toBe("Alice");
      expect(result.current.results[0]!.channelType).toBe("dm");
    });

    test("filters by channelId when provided", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello", channelId: "ch-2" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);
      expect(String(result.current.results[0]!.messageId)).toBe("m3");
    });

    test("sorts results by createdAt descending (newest first)", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      const dates = result.current.results.map((r) => r.createdAt);
      for (let i = 1; i < dates.length; i++) {
        expect(new Date(dates[i - 1]!).getTime()).toBeGreaterThanOrEqual(new Date(dates[i]!).getTime());
      }
    });

    test("paginates with offset and page size of 20", async () => {
      // Create 25 messages that match "item"
      const msgs: Record<string, Message> = {};
      for (let i = 0; i < 25; i++) {
        const id = `msg-${String(i).padStart(2, "0")}`;
        msgs[id] = makeMessage({
          id: msgId(id),
          channelId: chId("ch-1"),
          content: `item ${i}`,
          createdAt: `2026-01-${String(25 - i).padStart(2, "0")}T00:00:00Z`,
        });
      }
      mockMessagesById = msgs;

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "item" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(20);
      expect(result.current.total).toBe(25);
      expect(result.current.hasMore).toBe(true);

      // Load more
      await act(async () => {
        result.current.loadMore();
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(result.current.results).toHaveLength(25);
      expect(result.current.hasMore).toBe(false);
    });

    test("sets userDisplayName from senderDisplayName or falls back to userId", async () => {
      mockMessagesById = {
        "m-named": makeMessage({ id: msgId("m-named"), channelId: chId("ch-1"), content: "test", senderDisplayName: "Named" }),
        "m-anon": makeMessage({ id: msgId("m-anon"), channelId: chId("ch-1"), content: "test", senderDisplayName: undefined, userId: usrId("uid-anon") }),
      };

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      const named = result.current.results.find((r) => String(r.messageId) === "m-named");
      const anon = result.current.results.find((r) => String(r.messageId) === "m-anon");
      expect(named?.userDisplayName).toBe("Named");
      expect(anon?.userDisplayName).toBe("uid-anon");
    });

    test("empty query clears results in gallery mode", async () => {
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
      expect(result.current.results.length).toBeGreaterThan(0);

      act(() => result.current.updateFilters({ q: "" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });

  // -------------------------------------------------------
  // Gallery mode - configured mock responses
  // -------------------------------------------------------
  describe("gallery mode with configured responses", () => {
    beforeEach(() => {
      mockIsGallery = true;
    });

    test("uses channelKey-specific response when available", async () => {
      mockGalleryMockData = {
        search: {
          responses: {
            "ch-1::hello": {
              results: [{ messageId: "configured-1", content: "configured" }],
              total: 1,
            },
          },
        },
      };

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello", channelId: "ch-1" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);
      expect(String(result.current.results[0]!.messageId)).toBe("configured-1");
    });

    test("falls back to wildcard key when channelId not matched", async () => {
      mockGalleryMockData = {
        search: {
          responses: {
            "*::hello": {
              results: [{ messageId: "wild-1", content: "wildcard" }],
              total: 1,
            },
          },
        },
      };

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "hello", channelId: "ch-999" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);
      expect(String(result.current.results[0]!.messageId)).toBe("wild-1");
    });

    test("falls back to defaultResponse when no key matches", async () => {
      mockGalleryMockData = {
        search: {
          defaultResponse: {
            results: [{ messageId: "default-1", content: "default" }],
            total: 1,
          },
        },
      };

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "anything" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.results).toHaveLength(1);
      expect(String(result.current.results[0]!.messageId)).toBe("default-1");
    });

    test("configured response with error sets error state", async () => {
      mockGalleryMockData = {
        search: {
          defaultResponse: {
            results: [],
            total: 0,
            error: "Mock search error",
          },
        },
      };

      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.error).toBe("Mock search error");
    });
  });

  // -------------------------------------------------------
  // hasMore calculation
  // -------------------------------------------------------
  describe("hasMore", () => {
    test("is true when offset + 20 < total", async () => {
      mockSearchMessages.mockResolvedValue({ results: Array.from({ length: 20 }, () => ({ messageId: "x" })), total: 50 });
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.hasMore).toBe(true);
    });

    test("is false when offset + 20 >= total", async () => {
      mockSearchMessages.mockResolvedValue({ results: [{ messageId: "x" }], total: 1 });
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.hasMore).toBe(false);
    });

    test("is false when total equals exactly 20", async () => {
      mockSearchMessages.mockResolvedValue({ results: Array.from({ length: 20 }, () => ({ messageId: "x" })), total: 20 });
      const { result } = renderHook(() => useSearch("ws"));

      act(() => result.current.updateFilters({ q: "test" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(result.current.hasMore).toBe(false);
    });
  });
});
