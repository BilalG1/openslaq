import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "../../test-utils";

let typingHandler: ((payload: { userId: string; channelId: string }) => void) | null = null;
let messageNewHandler: ((message: { userId: string; channelId: string }) => void) | null = null;

vi.mock("../useSocketEvent", () => ({
  useSocketEvent: (
    event: string,
    handler: (payload: { userId: string; channelId: string }) => void,
  ) => {
    if (event === "user:typing") {
      typingHandler = handler;
    }
    if (event === "message:new") {
      messageNewHandler = handler;
    }
  },
}));

import { useTypingTracking } from "./useTypingTracking";

const members = [
  { id: "user-1", displayName: "Alice" },
  { id: "user-2", displayName: "Bob" },
];

describe("useTypingTracking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    typingHandler = null;
    messageNewHandler = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores typing events from users not in the members list", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "unknown-user", channelId: "ch-1" });
    });

    // Unknown users should be silently ignored, not shown as "Someone"
    expect(result.current).toHaveLength(0);
  });

  it("calls onUnknownUser when a typing event comes from an unknown user", () => {
    const onUnknownUser = vi.fn();
    renderHook(() =>
      useTypingTracking("ch-1", "current-user", members, { onUnknownUser }),
    );

    act(() => {
      typingHandler?.({ userId: "unknown-user", channelId: "ch-1" });
    });

    expect(onUnknownUser).toHaveBeenCalledOnce();
  });

  it("does not call onUnknownUser for known members", () => {
    const onUnknownUser = vi.fn();
    renderHook(() =>
      useTypingTracking("ch-1", "current-user", members, { onUnknownUser }),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(onUnknownUser).not.toHaveBeenCalled();
  });

  it("resolves the user after members list refreshes", () => {
    const initialMembers = [{ id: "user-1", displayName: "Alice" }];
    const { result, rerender } = renderHook(
      ({ m }) => useTypingTracking("ch-1", "current-user", m),
      { initialProps: { m: initialMembers } },
    );

    // Unknown user types — ignored
    act(() => {
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
    });
    expect(result.current).toHaveLength(0);

    // Members list refreshes to include user-2
    const updatedMembers = [
      { id: "user-1", displayName: "Alice" },
      { id: "user-2", displayName: "Bob" },
    ];
    rerender({ m: updatedMembers });

    // Now user-2 types again — should be resolved
    act(() => {
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]!.displayName).toBe("Bob");
  });

  it("clears typing indicator when user sends a message", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });
    expect(result.current).toHaveLength(1);

    act(() => {
      messageNewHandler?.({ userId: "user-1", channelId: "ch-1" });
    });
    expect(result.current).toHaveLength(0);
  });

  it("only clears the sender's typing indicator on message:new", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
    });
    expect(result.current).toHaveLength(2);

    act(() => {
      messageNewHandler?.({ userId: "user-1", channelId: "ch-1" });
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]!.displayName).toBe("Bob");
  });
});
