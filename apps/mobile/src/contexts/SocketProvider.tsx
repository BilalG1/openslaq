import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChannelId } from "@openslaq/shared";
import {
  SocketManager,
  type SocketSnapshot,
} from "@openslaq/client-core";
import { useAuth } from "./AuthContext";
import { useServer } from "./ServerContext";
import { useNetworkMonitor } from "../hooks/useNetworkMonitor";

export interface SocketContextValue extends SocketSnapshot {
  isNetworkOffline: boolean;
  joinChannel: (channelId: ChannelId) => void;
  leaveChannel: (channelId: ChannelId) => void;
}

const defaultSnapshot: SocketSnapshot = {
  socket: null,
  status: "idle",
  lastError: null,
};

const SocketContext = createContext<SocketContextValue>({
  ...defaultSnapshot,
  isNetworkOffline: false,
  joinChannel: () => {},
  leaveChannel: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authProvider } = useAuth();
  const { apiUrl } = useServer();
  const network = useNetworkMonitor();

  const manager = useMemo(() => new SocketManager({ apiUrl }), [apiUrl]);

  // Destroy old manager when apiUrl changes or on unmount
  useEffect(() => () => { manager.destroy(); }, [manager]);

  const [snapshot, setSnapshot] = useState<SocketSnapshot>(defaultSnapshot);

  useEffect(() => manager.subscribe(setSnapshot), [manager]);

  useEffect(() => {
    if (!isAuthenticated) {
      manager.disconnectForLogout();
      return;
    }

    void manager.connect(() => authProvider.getAccessToken());
  }, [manager, isAuthenticated, authProvider]);

  // Proactively reconnect when network comes back online
  const prevConnected = useRef(network.isConnected);
  useEffect(() => {
    const wasOffline = !prevConnected.current;
    prevConnected.current = network.isConnected;

    if (wasOffline && network.isConnected && isAuthenticated) {
      void manager.connect(() => authProvider.getAccessToken());
    }
  }, [network.isConnected, manager, isAuthenticated, authProvider]);

  const isNetworkOffline = !network.isConnected;

  const contextValue = useMemo(
    () => ({
      socket: snapshot.socket,
      status: snapshot.status,
      lastError: snapshot.lastError,
      isNetworkOffline,
      joinChannel: (channelId: ChannelId) => manager.joinChannel(channelId),
      leaveChannel: (channelId: ChannelId) => manager.leaveChannel(channelId),
    }),
    [manager, snapshot.lastError, snapshot.socket, snapshot.status, isNetworkOffline],
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
