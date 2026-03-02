import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { HuddleProvider, useHuddle } from "../HuddleProvider";
import { useAuth } from "../AuthContext";
import { useChatStore } from "../ChatStoreProvider";

// Mock livekit-client
const mockConnect = jest.fn(() => Promise.resolve());
const mockDisconnect = jest.fn();
const mockSetMicrophoneEnabled = jest.fn(() => Promise.resolve());
const mockSetCameraEnabled = jest.fn(() => Promise.resolve());
const mockRoom = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  state: "connected",
  localParticipant: {
    identity: "user-1",
    isMicrophoneEnabled: true,
    isCameraEnabled: false,
    setMicrophoneEnabled: mockSetMicrophoneEnabled,
    setCameraEnabled: mockSetCameraEnabled,
    trackPublications: new Map(),
  },
  remoteParticipants: new Map(),
  on: jest.fn().mockReturnThis(),
  off: jest.fn().mockReturnThis(),
};

jest.mock("livekit-client", () => ({
  Room: jest.fn(() => mockRoom),
  RoomEvent: {
    ParticipantConnected: "participantConnected",
    ParticipantDisconnected: "participantDisconnected",
    TrackSubscribed: "trackSubscribed",
    TrackUnsubscribed: "trackUnsubscribed",
    TrackMuted: "trackMuted",
    TrackUnmuted: "trackUnmuted",
    ActiveSpeakersChanged: "activeSpeakersChanged",
    LocalTrackPublished: "localTrackPublished",
    LocalTrackUnpublished: "localTrackUnpublished",
    Disconnected: "disconnected",
  },
  ConnectionState: {
    Connected: "connected",
    Disconnected: "disconnected",
  },
}));

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock("@openslaq/client-core", () => ({
  authorizedHeaders: jest.fn(() => Promise.resolve({ Authorization: "Bearer token" })),
}));

jest.mock("../AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock("../ChatStoreProvider", () => ({
  useChatStore: jest.fn(),
}));

jest.mock("../../lib/env", () => ({
  env: { EXPO_PUBLIC_API_URL: "http://api.local" },
}));

const useAuthMock = useAuth as jest.Mock;
const useChatStoreMock = useChatStore as jest.Mock;

function Probe() {
  const { channelId, connected, isMuted, isCameraOn, participants, error, joinHuddle, leaveHuddle, toggleMute, toggleCamera } =
    useHuddle();

  return (
    <>
      <Text testID="channelId">{channelId ?? "none"}</Text>
      <Text testID="connected">{String(connected)}</Text>
      <Text testID="isMuted">{String(isMuted)}</Text>
      <Text testID="isCameraOn">{String(isCameraOn)}</Text>
      <Text testID="participants">{participants.length}</Text>
      <Text testID="error">{error ?? "none"}</Text>
      <TouchableOpacity testID="join" onPress={() => joinHuddle("ch-1")} />
      <TouchableOpacity testID="leave" onPress={leaveHuddle} />
      <TouchableOpacity testID="toggleMute" onPress={toggleMute} />
      <TouchableOpacity testID="toggleCamera" onPress={toggleCamera} />
    </>
  );
}

describe("HuddleProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoom.state = "connected";
    mockRoom.localParticipant.isMicrophoneEnabled = true;
    mockRoom.localParticipant.isCameraEnabled = false;
    mockRoom.remoteParticipants = new Map();

    useAuthMock.mockReturnValue({
      authProvider: { requireAccessToken: () => Promise.resolve("token") },
      user: { id: "user-1" },
    });

    useChatStoreMock.mockReturnValue({
      state: {
        currentHuddleChannelId: null,
        activeHuddles: {},
        channels: [],
        dms: [],
      },
      dispatch: mockDispatch,
    });
  });

  it("renders with no huddle by default", () => {
    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    expect(screen.getByTestId("channelId").children.join("")).toBe("none");
    expect(screen.getByTestId("connected").children.join("")).toBe("false");
  });

  it("dispatches huddle/setCurrentChannel when joinHuddle is called", () => {
    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    fireEvent.press(screen.getByTestId("join"));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "huddle/setCurrentChannel",
      channelId: "ch-1",
    });
  });

  it("dispatches huddle/setCurrentChannel(null) and huddle/ended on leaveHuddle", () => {
    useChatStoreMock.mockReturnValue({
      state: {
        currentHuddleChannelId: "ch-1",
        activeHuddles: {},
        channels: [],
        dms: [],
      },
      dispatch: mockDispatch,
    });

    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    fireEvent.press(screen.getByTestId("leave"));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "huddle/setCurrentChannel",
      channelId: null,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "huddle/ended",
      channelId: "ch-1",
    });
  });

  it("connects to LiveKit when channelId is set", async () => {
    // Mock fetch for the join endpoint
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "lk-token", wsUrl: "wss://lk.local" }),
      }),
    ) as unknown as typeof fetch;

    useChatStoreMock.mockReturnValue({
      state: {
        currentHuddleChannelId: "ch-1",
        activeHuddles: {},
        channels: [],
        dms: [],
      },
      dispatch: mockDispatch,
    });

    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith("wss://lk.local", "lk-token");
    });

    expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true);
  });

  it("handles join error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      }),
    ) as unknown as typeof fetch;

    useChatStoreMock.mockReturnValue({
      state: {
        currentHuddleChannelId: "ch-1",
        activeHuddles: {},
        channels: [],
        dms: [],
      },
      dispatch: mockDispatch,
    });

    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "huddle/setCurrentChannel",
        channelId: null,
      });
    });
  });

  it("toggleMute calls setMicrophoneEnabled", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "lk-token", wsUrl: "wss://lk.local" }),
      }),
    ) as unknown as typeof fetch;

    useChatStoreMock.mockReturnValue({
      state: {
        currentHuddleChannelId: "ch-1",
        activeHuddles: {},
        channels: [],
        dms: [],
      },
      dispatch: mockDispatch,
    });

    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId("toggleMute"));

    expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false);
  });

  it("toggleCamera calls setCameraEnabled", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "lk-token", wsUrl: "wss://lk.local" }),
      }),
    ) as unknown as typeof fetch;

    useChatStoreMock.mockReturnValue({
      state: {
        currentHuddleChannelId: "ch-1",
        activeHuddles: {},
        channels: [],
        dms: [],
      },
      dispatch: mockDispatch,
    });

    render(
      <HuddleProvider>
        <Probe />
      </HuddleProvider>,
    );

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId("toggleCamera"));

    expect(mockSetCameraEnabled).toHaveBeenCalledWith(true);
  });
});
