import { describe, expect, it, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
import type { TypedSocket } from "../socket";
import { useSocketEvent } from "./useSocketEvent";

type Listener = (...args: unknown[]) => void;

function createMockSocket() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    on: mock((event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    }),
    off: mock((event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    }),
    _emit(event: string, ...args: unknown[]) {
      listeners.get(event)?.forEach((l) => l(...args));
    },
  } as unknown as TypedSocket & {
    on: ReturnType<typeof mock>;
    off: ReturnType<typeof mock>;
    _emit: (event: string, ...args: unknown[]) => void;
  };
}

describe("useSocketEvent", () => {
  it("does nothing when socket is null", () => {
    const handler = mock();
    renderHook(() => useSocketEvent("message:new", handler, null));
    expect(handler).not.toHaveBeenCalled();
  });

  it("registers and unregisters listener", () => {
    const socket = createMockSocket();
    const handler = mock();

    const { unmount } = renderHook(() =>
      useSocketEvent("message:new", handler, socket as unknown as TypedSocket),
    );

    expect(socket.on).toHaveBeenCalledTimes(1);
    expect(socket.on.mock.calls[0]![0]).toBe("message:new");

    unmount();

    expect(socket.off).toHaveBeenCalledTimes(1);
    expect(socket.off.mock.calls[0]![0]).toBe("message:new");
  });

  it("calls the latest handler on event", () => {
    const socket = createMockSocket();
    const handler1 = mock();
    const handler2 = mock();

    const { rerender } = renderHook(
      ({ handler }) =>
        useSocketEvent(
          "message:new",
          handler,
          socket as unknown as TypedSocket,
        ),
      { initialProps: { handler: handler1 } },
    );

    // Update handler without re-subscribing
    rerender({ handler: handler2 });

    // Should still only have one subscription
    expect(socket.on).toHaveBeenCalledTimes(1);

    // Emitting should call the latest handler
    socket._emit("message:new", { id: "1" });
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("re-subscribes when socket changes", () => {
    const socket1 = createMockSocket();
    const socket2 = createMockSocket();
    const handler = mock();

    const { rerender } = renderHook(
      ({ socket }) =>
        useSocketEvent(
          "message:new",
          handler,
          socket as unknown as TypedSocket,
        ),
      { initialProps: { socket: socket1 } },
    );

    expect(socket1.on).toHaveBeenCalledTimes(1);

    rerender({ socket: socket2 });

    expect(socket1.off).toHaveBeenCalledTimes(1);
    expect(socket2.on).toHaveBeenCalledTimes(1);
  });
});
