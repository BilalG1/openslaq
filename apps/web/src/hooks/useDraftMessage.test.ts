import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "../test-utils";

const PREFIX = "openslaq-draft-";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock external dependencies used by useDraftMessage
vi.mock("@openslaq/client-core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  upsertDraftOp: vi.fn(async () => ({})),
  deleteDraftByKeyOp: vi.fn(async () => {}),
  fetchDraftForChannel: vi.fn(async () => null),
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
