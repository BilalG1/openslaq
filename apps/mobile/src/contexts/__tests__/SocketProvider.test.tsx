import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { SocketManager } from "@openslaq/client-core";
import { SocketProvider, useSocket } from "../SocketProvider";
import { useAuth } from "../AuthContext";

jest.mock("@openslaq/client-core", () => ({
  SocketManager: jest.fn(),
}));

jest.mock("../AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mockNetworkState = { isConnected: true, isInternetReachable: true };
jest.mock("../../hooks/useNetworkMonitor", () => ({
  useNetworkMonitor: () => mockNetworkState,
}));

jest.mock("../../lib/env", () => ({
  env: {
    EXPO_PUBLIC_API_URL: "http://api.local",
  },
}));

const socketManagerCtorMock = SocketManager as unknown as jest.Mock;
const useAuthMock = useAuth as jest.Mock;

type MockSocketSnapshot = {
  socket: unknown;
  status: "idle" | "connecting" | "connected";
  lastError: string | null;
};

function Probe() {
  const { status, isNetworkOffline, joinChannel, leaveChannel } = useSocket();

  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="offline">{String(isNetworkOffline)}</Text>
      <TouchableOpacity
        testID="join"
        onPress={() => joinChannel("channel-1" as never)}
      />
      <TouchableOpacity
        testID="leave"
        onPress={() => leaveChannel("channel-1" as never)}
      />
    </>
  );
}

describe("SocketProvider", () => {
  let snapshotListener: ((snapshot: MockSocketSnapshot) => void) | null;
  let unsubscribe: jest.Mock;
  let manager: {
    subscribe: jest.Mock;
    connect: jest.Mock;
    disconnectForLogout: jest.Mock;
    destroy: jest.Mock;
    joinChannel: jest.Mock;
    leaveChannel: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    snapshotListener = null;
    unsubscribe = jest.fn();
    manager = {
      subscribe: jest.fn((listener: (snapshot: MockSocketSnapshot) => void) => {
        snapshotListener = listener;
        return unsubscribe;
      }),
      connect: jest.fn(() => Promise.resolve()),
      disconnectForLogout: jest.fn(),
      destroy: jest.fn(),
      joinChannel: jest.fn(),
      leaveChannel: jest.fn(),
    };
    socketManagerCtorMock.mockImplementation(() => manager);
  });

  it("connects when authenticated and uses authProvider token getter", async () => {
    const getAccessToken = jest.fn(() => Promise.resolve("access-token"));
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      authProvider: { getAccessToken },
    });

    render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    await waitFor(() => {
      expect(manager.connect).toHaveBeenCalledTimes(1);
    });

    const tokenGetter = manager.connect.mock.calls[0]?.[0] as () => Promise<string>;
    await expect(tokenGetter()).resolves.toBe("access-token");
    expect(manager.disconnectForLogout).not.toHaveBeenCalled();
  });

  it("disconnects when user is not authenticated", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      authProvider: { getAccessToken: jest.fn() },
    });

    render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    expect(manager.disconnectForLogout).toHaveBeenCalledTimes(1);
    expect(manager.connect).not.toHaveBeenCalled();
  });

  it("forwards join and leave methods to SocketManager", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      authProvider: { getAccessToken: jest.fn() },
    });

    render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    fireEvent.press(screen.getByTestId("join"));
    fireEvent.press(screen.getByTestId("leave"));

    expect(manager.joinChannel).toHaveBeenCalledWith("channel-1");
    expect(manager.leaveChannel).toHaveBeenCalledWith("channel-1");
  });

  it("updates snapshot state from manager subscription", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      authProvider: { getAccessToken: jest.fn() },
    });

    render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    expect(screen.getByTestId("status").children.join("")).toBe("idle");

    act(() => {
      snapshotListener?.({
        socket: null,
        status: "connecting",
        lastError: null,
      });
    });

    expect(screen.getByTestId("status").children.join("")).toBe("connecting");
  });

  it("cleans up subscriptions and destroys manager on unmount", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      authProvider: { getAccessToken: jest.fn() },
    });

    const { unmount } = render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(manager.destroy).toHaveBeenCalledTimes(1);
  });

  it("exposes isNetworkOffline based on network state", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      authProvider: { getAccessToken: jest.fn() },
    });

    mockNetworkState.isConnected = false;

    render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    expect(screen.getByTestId("offline").children.join("")).toBe("true");

    // Reset for other tests
    mockNetworkState.isConnected = true;
  });

  it("triggers reconnect when network comes back online", async () => {
    const getAccessToken = jest.fn(() => Promise.resolve("token"));
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      authProvider: { getAccessToken },
    });

    // Start offline
    mockNetworkState.isConnected = false;

    const { rerender } = render(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    // connect called once from auth effect
    expect(manager.connect).toHaveBeenCalledTimes(1);

    // Network comes back
    mockNetworkState.isConnected = true;
    rerender(
      <SocketProvider>
        <Probe />
      </SocketProvider>,
    );

    await waitFor(() => {
      // Called again from network recovery
      expect(manager.connect).toHaveBeenCalledTimes(2);
    });
  });
});
