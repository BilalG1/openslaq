import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../test-utils";

const mockEmit = vi.fn();
let mockSocket: { emit: typeof mockEmit } | null = { emit: mockEmit };
vi.mock("../useSocket", () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

import { useTypingEmitter } from "./useTypingEmitter";

describe("useTypingEmitter", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockSocket = { emit: mockEmit };
  });

  test("emits typing event on first call", () => {
    const { result } = renderHook(() => useTypingEmitter("ch-1"));

    act(() => {
      result.current.emitTyping();
    });

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith("message:typing", { channelId: "ch-1" });
  });

  test("debounces subsequent calls within 2500ms", () => {
    let now = 10000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const { result } = renderHook(() => useTypingEmitter("ch-1"));

    act(() => result.current.emitTyping());
    expect(mockEmit).toHaveBeenCalledTimes(1);

    // 500ms later — still debounced
    now += 500;
    act(() => result.current.emitTyping());
    expect(mockEmit).toHaveBeenCalledTimes(1);

    // 1999ms later (2499 total) — still debounced (< 2500)
    now += 1999;
    act(() => result.current.emitTyping());
    expect(mockEmit).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  test("re-emits after debounce period expires", () => {
    let now = 10000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const { result } = renderHook(() => useTypingEmitter("ch-1"));

    act(() => result.current.emitTyping());
    expect(mockEmit).toHaveBeenCalledTimes(1);

    // 2501ms later — debounce expired
    now += 2501;
    act(() => result.current.emitTyping());
    expect(mockEmit).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  test("does not emit when socket is null", () => {
    mockSocket = null;
    const { result } = renderHook(() => useTypingEmitter("ch-1"));

    act(() => result.current.emitTyping());

    expect(mockEmit).not.toHaveBeenCalled();
  });

  test("does not emit when channelId is undefined", () => {
    const { result } = renderHook(() => useTypingEmitter(undefined));

    act(() => result.current.emitTyping());

    expect(mockEmit).not.toHaveBeenCalled();
  });
});
