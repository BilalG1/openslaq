import type { ReactNode } from "react";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import type { ChannelId } from "@openslaq/shared";
import {
  SocketManager,
  type SocketSnapshot,
} from "@openslaq/client-core";
import { env } from "../env";

export interface SocketContextValue extends SocketSnapshot {
  joinChannel: (channelId: ChannelId) => void;
  leaveChannel: (channelId: ChannelId) => void;
}

const defaultSnapshot: SocketSnapshot = {
  socket: null,
  status: "idle",
  lastError: null,
};

export const SocketContext = createContext<SocketContextValue>({
  ...defaultSnapshot,
  joinChannel: () => {},
  leaveChannel: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const user = useCurrentUser();
  const managerRef = useRef<SocketManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new SocketManager({ apiUrl: env.VITE_API_URL });
  }
  const manager = managerRef.current;

  const [snapshot, setSnapshot] = useState<SocketSnapshot>(defaultSnapshot);

  useEffect(() => manager.subscribe(setSnapshot), [manager]);

  useEffect(() => {
    if (!user) {
      manager.disconnectForLogout();
      return;
    }

    void manager.connect(async () => {
      const authJson = await user.getAuthJson();
      return authJson.accessToken ?? null;
    });
  }, [manager, user]);

  useEffect(
    () => () => {
      manager.destroy();
    },
    [manager],
  );

  const contextValue = useMemo(
    () => ({
      socket: snapshot.socket,
      status: snapshot.status,
      lastError: snapshot.lastError,
      joinChannel: (channelId: ChannelId) => manager.joinChannel(channelId),
      leaveChannel: (channelId: ChannelId) => manager.leaveChannel(channelId),
    }),
    [manager, snapshot.lastError, snapshot.socket, snapshot.status],
  );

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}
