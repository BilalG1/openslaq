import { describe, expect, test, beforeEach, afterEach, mock, jest } from "bun:test";
import { renderHook, act, cleanup } from "../test-utils";

const PREFIX = "openslaq-draft-";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock external dependencies used by useDraftMessage
const _realClientCore = require("@openslaq/client-core");
mock.module("@openslaq/client-core", () => ({
  ..._realClientCore,
  upsertDraftOp: jest.fn(async () => ({})),
  deleteDraftByKeyOp: jest.fn(async () => {}),
  fetchDraftForChannel: jest.fn(async () => null),
}));

mock.module("../state/chat-store", () => ({
  useChatStore: () => ({
    state: { activeView: "channel" },
    dispatch: jest.fn(),
  }),
}));

const _realApiClient = require("../lib/api-client");
mock.module("../lib/api-client", () => ({
  ..._realApiClient,
  useAuthProvider: () => ({ getToken: async () => "test-token" }),
}));

mock.module("../api", () => ({
  api: {},
}));

const { useDraftMessage } = await import("./useDraftMessage");

describe("useDraftMessage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  test("returns null draft when no saved draft exists", () => {
    const { result } = renderHook(() => useDraftMessage("ch-1"));
    expect(result.current.draft).toBeNull();
  });

  test("returns saved draft from localStorage on mount (legacy string)", () => {
    localStorage.setItem(PREFIX + "ch-1", "hello world");
    const { result } = renderHook(() => useDraftMessage("ch-1"));
    expect(result.current.draft).toBe("hello world");
  });

  test("returns saved draft from localStorage on mount (JSON format)", () => {
    localStorage.setItem(PREFIX + "ch-1", JSON.stringify({ content: "json draft", updatedAt: Date.now() }));
    const { result } = renderHook(() => useDraftMessage("ch-1"));
    expect(result.current.draft).toBe("json draft");
  });

  test("returns null draft when draftKey is undefined", () => {
    const { result } = renderHook(() => useDraftMessage(undefined));
    expect(result.current.draft).toBeNull();
  });

  test("saveDraft writes to localStorage after debounce", async () => {
    const { result } = renderHook(() => useDraftMessage("ch-1"));

    act(() => {
      result.current.saveDraft("new draft");
    });

    // Not saved yet (debounced at 300ms)
    expect(localStorage.getItem(PREFIX + "ch-1")).toBeNull();

    // Wait for debounce to fire
    await sleep(350);

    const stored = JSON.parse(localStorage.getItem(PREFIX + "ch-1")!);
    expect(stored.content).toBe("new draft");
  });

  test("saveDraft trims whitespace", async () => {
    const { result } = renderHook(() => useDraftMessage("ch-1"));

    act(() => {
      result.current.saveDraft("  trimmed  ");
    });

    await sleep(350);
    const stored = JSON.parse(localStorage.getItem(PREFIX + "ch-1")!);
    expect(stored.content).toBe("trimmed");
  });

  test("clearDraft removes from localStorage", () => {
    localStorage.setItem(PREFIX + "ch-1", JSON.stringify({ content: "draft text", updatedAt: Date.now() }));
    const { result } = renderHook(() => useDraftMessage("ch-1"));

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(PREFIX + "ch-1")).toBeNull();
  });

  test("clearDraft cancels pending debounced save", async () => {
    const { result } = renderHook(() => useDraftMessage("ch-1"));

    act(() => {
      result.current.saveDraft("pending");
      result.current.clearDraft();
    });

    await sleep(350);
    expect(localStorage.getItem(PREFIX + "ch-1")).toBeNull();
  });

  test("different channels maintain separate drafts", () => {
    localStorage.setItem(PREFIX + "ch-1", JSON.stringify({ content: "draft 1", updatedAt: Date.now() }));
    localStorage.setItem(PREFIX + "ch-2", JSON.stringify({ content: "draft 2", updatedAt: Date.now() }));

    const { result: r1 } = renderHook(() => useDraftMessage("ch-1"));
    const { result: r2 } = renderHook(() => useDraftMessage("ch-2"));

    expect(r1.current.draft).toBe("draft 1");
    expect(r2.current.draft).toBe("draft 2");
  });

  test("unmount cancels pending debounced save", async () => {
    const { result, unmount } = renderHook(() => useDraftMessage("ch-1"));

    act(() => {
      result.current.saveDraft("should not persist");
    });

    // Unmount before debounce fires
    unmount();

    // Wait past debounce period
    await sleep(350);

    // The timer was cleared on unmount so nothing was written
    expect(localStorage.getItem(PREFIX + "ch-1")).toBeNull();
  });
});
