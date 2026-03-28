import { useCallback, useRef } from "react";
import { asChannelId, type ChannelId } from "@openslaq/shared";
import { useSocket } from "@/contexts/SocketProvider";

const DEBOUNCE_MS = 2500;

export function useTypingEmitter(channelId: ChannelId | undefined) {
  const { socket } = useSocket();
  const lastEmitRef = useRef(0);

  const emitTyping = useCallback(() => {
    if (!socket || !channelId) return;

    const now = Date.now();
    if (now - lastEmitRef.current < DEBOUNCE_MS) return;

    lastEmitRef.current = now;
    socket.emit("message:typing", { channelId: asChannelId(channelId) });
  }, [socket, channelId]);

  return { emitTyping };
}
