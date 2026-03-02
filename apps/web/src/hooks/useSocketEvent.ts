import type { ServerToClientEvents } from "@openslaq/shared";
import { useSocketEvent as useSocketEventCore } from "@openslaq/client-core";
import { useSocket } from "./useSocket";

export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
) {
  const { socket } = useSocket();
  useSocketEventCore(event, handler, socket);
}
