import { renderHook, act } from "@testing-library/react-native";
import { asChannelId } from "@openslaq/shared";
import { useTypingEmitter } from "../useTypingEmitter";

const mockEmit = jest.fn();
jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => ({
    socket: { emit: mockEmit },
    status: "connected",
    lastError: null,
    joinChannel: jest.fn(),
    leaveChannel: jest.fn(),
  }),
}));

describe("useTypingEmitter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits message:typing on first call", () => {
    const { result } = renderHook(() => useTypingEmitter(asChannelId("ch-1")));

    act(() => {
      result.current.emitTyping();
    });

    expect(mockEmit).toHaveBeenCalledWith("message:typing", { channelId: "ch-1" });
  });

  it("debounces rapid calls within 2.5s", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useTypingEmitter(asChannelId("ch-1")));

    act(() => {
      result.current.emitTyping();
    });
    expect(mockEmit).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.emitTyping();
    });
    expect(mockEmit).toHaveBeenCalledTimes(1);

    // Advance past debounce threshold
    jest.advanceTimersByTime(2600);

    act(() => {
      result.current.emitTyping();
    });
    expect(mockEmit).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it("does not emit when channelId is undefined", () => {
    const { result } = renderHook(() => useTypingEmitter(undefined));

    act(() => {
      result.current.emitTyping();
    });

    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe("useTypingEmitter with null socket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not emit when socket is null", () => {
    // Override the mock for this test
    const useSocketModule = require("@/contexts/SocketProvider");
    const original = useSocketModule.useSocket;
    useSocketModule.useSocket = () => ({
      socket: null,
      status: "idle",
      lastError: null,
      joinChannel: jest.fn(),
      leaveChannel: jest.fn(),
    });

    const { result } = renderHook(() => useTypingEmitter(asChannelId("ch-1")));

    act(() => {
      result.current.emitTyping();
    });

    expect(mockEmit).not.toHaveBeenCalled();

    useSocketModule.useSocket = original;
  });
});
