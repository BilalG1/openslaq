import { renderHook, act } from "@testing-library/react-native";
import { asChannelId, asUserId } from "@openslaq/shared";
import { useTypingTracking } from "../useTypingTracking";

let typingHandler: ((payload: { userId: string; channelId: string }) => void) | null = null;
let messageNewHandler: ((message: { userId: string; channelId: string }) => void) | null = null;

jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
    },
    status: "connected",
    lastError: null,
    joinChannel: jest.fn(),
    leaveChannel: jest.fn(),
  }),
}));

jest.mock("../useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: (payload: { userId: string; channelId: string }) => void) => {
    if (event === "user:typing") {
      typingHandler = handler;
    }
    if (event === "message:new") {
      messageNewHandler = handler;
    }
  },
}));

const members = [
  { id: asUserId("user-1"), displayName: "Alice" },
  { id: asUserId("user-2"), displayName: "Bob" },
  { id: asUserId("user-3"), displayName: "Charlie" },
];

describe("useTypingTracking", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    typingHandler = null;
    messageNewHandler = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("adds a typing user on event", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]!.displayName).toBe("Alice");
  });

  it("filters out own user", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("user-1"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(0);
  });

  it("filters out events for other channels", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-other" });
    });

    expect(result.current).toHaveLength(0);
  });

  it("expires users after 5s", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(result.current).toHaveLength(0);
  });

  it("refreshes expiry on repeated typing", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Refresh the typing event
    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should still be there (refreshed 3s ago, expires in 2s)
    expect(result.current).toHaveLength(1);
  });

  it("resolves display names from members", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
    });

    expect(result.current[0]!.displayName).toBe("Bob");
  });

  it("shows 'Someone' for unknown user", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "unknown-user", channelId: "ch-1" });
    });

    expect(result.current[0]!.displayName).toBe("Someone");
  });

  it("clears typing users on channel change", () => {
    const { result, rerender } = renderHook(
      ({ channelId }) => useTypingTracking(channelId, asUserId("current-user"), members),
      { initialProps: { channelId: asChannelId("ch-1") } },
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);

    rerender({ channelId: asChannelId("ch-2") });

    expect(result.current).toHaveLength(0);
  });

  it("tracks multiple simultaneous typing users", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
      typingHandler?.({ userId: "user-3", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(3);
    const names = result.current.map((u) => u.displayName).sort();
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("does not add duplicate entries for same user", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);
  });

  it("clears typing indicator when user sends a message", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
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
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
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

  it("users expire independently", () => {
    const { result } = renderHook(() =>
      useTypingTracking(asChannelId("ch-1"), asUserId("current-user"), members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    // Add user-2 after 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => {
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
    });

    // At 6s: user-1 should have expired, user-2 still active
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]!.displayName).toBe("Bob");
  });
});
