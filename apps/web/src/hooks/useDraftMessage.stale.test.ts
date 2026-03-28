import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "../test-utils";

vi.mock("@stripe/stripe-js", () => ({ loadStripe: async () => null }));

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockUpsertDraft = vi.fn(async (..._args: unknown[]) => ({}));
const mockDeleteDraft = vi.fn(async (..._args: unknown[]) => {});
const mockFetchDraft = vi.fn(async (..._args: unknown[]) => null);

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  upsertDraftOp: (...args: unknown[]) => mockUpsertDraft(...args),
  deleteDraftByKeyOp: (...args: unknown[]) => mockDeleteDraft(...args),
  fetchDraftForChannel: (...args: unknown[]) => mockFetchDraft(...args),
  };
});

vi.mock("../state/chat-store", () => ({
  useChatStore: () => ({
    state: { activeView: "channel" },
    dispatch: vi.fn(),
  }),
}));

vi.mock("../lib/api-client", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  useAuthProvider: () => ({ getToken: async () => "test-token" }),
  };
});

vi.mock("../api", () => ({
  api: {},
}));

import { useDraftMessage } from "./useDraftMessage";

describe("useDraftMessage — stale server draft bugs", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUpsertDraft.mockClear();
    mockDeleteDraft.mockClear();
    mockFetchDraft.mockClear();
  });

  afterEach(cleanup);

  test("BUG: saving empty text should cancel pending server save timer", async () => {
    const options = { workspaceSlug: "ws", channelId: "ch-1" };
    const { result } = renderHook(() => useDraftMessage("ch-1", options));

    // Type "hello" — starts both local and server debounce timers
    act(() => {
      result.current.saveDraft("hello");
    });

    // Quickly delete all text (before 2s server debounce fires)
    act(() => {
      result.current.saveDraft("");
    });

    // Wait for both debounce periods to pass
    await sleep(2100);

    // The server should NOT have received "hello" — the empty save should have
    // cancelled the pending server timer. But currently it doesn't.
    expect(mockUpsertDraft).not.toHaveBeenCalled();
  });

  test("BUG: saving empty text should delete server draft", async () => {
    const options = { workspaceSlug: "ws", channelId: "ch-1" };
    const { result } = renderHook(() => useDraftMessage("ch-1", options));

    // Save a draft first
    act(() => {
      result.current.saveDraft("hello");
    });
    await sleep(2100);
    expect(mockUpsertDraft).toHaveBeenCalledTimes(1);
    mockUpsertDraft.mockClear();

    // Now clear it by typing empty
    act(() => {
      result.current.saveDraft("");
    });
    await sleep(2100);

    // The server draft should be deleted, otherwise next visit shows stale "hello"
    // Currently neither upsertDraft("") nor deleteDraft is called
    const serverWasCleared =
      mockDeleteDraft.mock.calls.length > 0 ||
      mockUpsertDraft.mock.calls.some((call: unknown[]) => {
        const arg = call[1] as { content?: string } | undefined;
        return arg?.content === "";
      });
    expect(serverWasCleared).toBe(true);
  });
});
