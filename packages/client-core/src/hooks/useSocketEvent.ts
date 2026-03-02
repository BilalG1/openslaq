import { useEffect, useRef } from "react";
import type { ServerToClientEvents } from "@openslaq/shared";
import type { TypedSocket } from "../socket";

export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
  socket: TypedSocket | null,
) {
  const handlerRef = useRef<ServerToClientEvents[E]>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;
    const socketApi = socket as {
      on: (event: E, listener: ServerToClientEvents[E]) => void;
      off: (event: E, listener: ServerToClientEvents[E]) => void;
    };
    const listener: ServerToClientEvents[E] = ((...args: never[]) => {
      const current = handlerRef.current as (...listenerArgs: never[]) => void;
      current(...args);
    }) as ServerToClientEvents[E];

    socketApi.on(event, listener);
    return () => {
      socketApi.off(event, listener);
    };
  }, [socket, event]);
}
