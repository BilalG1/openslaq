import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "../test-utils";
import { fireEvent } from "@testing-library/react";
import { ConnectionState, Track } from "livekit-client";

// --- Mocks (must be before component import) ---

// Prevent @stripe/stripe-js side-effect script injection in happy-dom
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ channelId: "ch-1" }),
}));

const mockUser = {
  id: "user-1",
  displayName: "Test User",
  getAuthJson: async () => ({ accessToken: "tok" }),
};
vi.mock("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

vi.mock("../lib/api-client", () => ({
  authorizedHeaders: async () => ({ Authorization: "Bearer tok" }),
  useAuthProvider: () => ({ requireAccessToken: async () => "tok" }),
}));

vi.mock("../api", () => ({
  api: {},
}));

vi.mock("../env", () => ({
  env: { VITE_API_URL: "http://localhost:3001" },
}));

const mockNotifyHuddleLeave = vi.fn(() => Promise.resolve({ ended: false }));
vi.mock("@openslaq/client-core", async () => {
  const actual = await vi.importActual<typeof import("@openslaq/client-core")>("@openslaq/client-core");
  return { ...actual, notifyHuddleLeave: () => mockNotifyHuddleLeave() };
});

// LiveKit mocks
let mockConnectionState = ConnectionState.Connected;
const mockSetMicrophoneEnabled = vi.fn(async () => {});
const mockSetCameraEnabled = vi.fn(async () => {});
const mockSetScreenShareEnabled = vi.fn(async () => {});
const mockRoomDisconnect = vi.fn(async () => {});
const mockSwitchActiveDevice = vi.fn(async () => {});

const mockLocalParticipant = {
  identity: "user-1",
  name: "Test User",
  isSpeaking: false,
  trackPublications: new Map([
    ["mic", { source: Track.Source.Microphone, isMuted: false }],
  ]),
  setMicrophoneEnabled: mockSetMicrophoneEnabled,
  setCameraEnabled: mockSetCameraEnabled,
  setScreenShareEnabled: mockSetScreenShareEnabled,
};

const mockRoom = {
  disconnect: mockRoomDisconnect,
  switchActiveDevice: mockSwitchActiveDevice,
};

let mockIsMicrophoneEnabled = true;
let mockIsCameraEnabled = false;
let mockIsScreenShareEnabled = false;

vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children, onError }: { children: React.ReactNode; onError?: (err: Error) => void; [k: string]: unknown }) => {
    // Store onError so tests can trigger it
    (globalThis as unknown as Record<string, unknown>).__lkOnError = onError;
    return <>{children}</>;
  },
  RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
  useLocalParticipant: () => ({
    localParticipant: mockLocalParticipant,
    isMicrophoneEnabled: mockIsMicrophoneEnabled,
    isCameraEnabled: mockIsCameraEnabled,
    isScreenShareEnabled: mockIsScreenShareEnabled,
  }),
  useRemoteParticipants: () => [],
  useConnectionState: () => mockConnectionState,
  useRoomContext: () => mockRoom,
  useTracks: () => [],
  useIsSpeaking: () => false,
}));

vi.mock("../components/ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../components/huddle/VideoGrid", () => ({
  VideoGrid: ({ participants }: { participants: { participant: { isMuted?: boolean }; isLocal: boolean }[] }) => (
    <div data-testid="video-grid">{participants.length} tiles</div>
  ),
}));

vi.mock("../components/huddle/DeviceSelector", () => ({
  DeviceSelector: () => <div data-testid="device-selector" />,
}));

// Mock useHuddleToken
let mockToken: string | null = "lk-token";
let mockWsUrl: string | null = "ws://localhost";
let mockTokenError: string | null = null;

vi.mock("../hooks/chat/useHuddleToken", () => ({
  useHuddleToken: () => ({
    token: mockToken,
    wsUrl: mockWsUrl,
    error: mockTokenError,
    isLoading: false,
  }),
}));

import { HuddlePage } from "./HuddlePage";

// --- Tests ---

describe("HuddlePage", () => {
  beforeEach(() => {
    mockConnectionState = ConnectionState.Connected;
    mockToken = "lk-token";
    mockWsUrl = "ws://localhost";
    mockTokenError = null;
    mockIsMicrophoneEnabled = true;
    mockIsCameraEnabled = false;
    mockIsScreenShareEnabled = false;
    mockSetMicrophoneEnabled.mockClear();
    mockSetCameraEnabled.mockClear();
    mockSetScreenShareEnabled.mockClear();
    mockRoomDisconnect.mockClear();
    mockSwitchActiveDevice.mockClear();
    mockNotifyHuddleLeave.mockClear();
  });

  afterEach(cleanup);

  test("renders RoomAudioRenderer (fixes remote audio bug)", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });
    expect(screen.getByTestId("room-audio-renderer")).toBeTruthy();
  });

  test("renders connecting state when not connected", async () => {
    mockConnectionState = ConnectionState.Connecting;

    await act(async () => {
      render(<HuddlePage />);
    });

    expect(screen.getByText("Connecting...")).toBeTruthy();
  });

  test("renders video grid when connected", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    expect(screen.getByTestId("video-grid")).toBeTruthy();
  });

  test("token error shows error text", async () => {
    mockTokenError = "Room not found";

    await act(async () => {
      render(<HuddlePage />);
    });

    expect(screen.getByText("Room not found")).toBeTruthy();
  });

  test("badge shows channel name", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    const badge = screen.getByTestId("huddle-badge");
    expect(badge.textContent).toContain("Huddle");
  });

  test("mute toggle calls setMicrophoneEnabled", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    const muteBtn = screen.getByTestId("huddle-mute-toggle");
    await act(async () => {
      fireEvent.click(muteBtn);
    });

    expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false);
  });

  test("camera toggle calls setCameraEnabled", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    expect(mockSetCameraEnabled).toHaveBeenCalledWith(true);
  });

  test("screen share toggle calls setScreenShareEnabled", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    const shareBtn = screen.getByTestId("huddle-screenshare-toggle");
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(mockSetScreenShareEnabled).toHaveBeenCalledWith(true);
  });

  test("leave button disconnects and notifies server", async () => {
    const closeSpy = vi.fn();
    window.close = closeSpy;

    await act(async () => {
      render(<HuddlePage />);
    });

    const leaveBtn = screen.getByTestId("huddle-leave");
    await act(async () => {
      fireEvent.click(leaveBtn);
    });

    expect(mockRoomDisconnect).toHaveBeenCalled();
    expect(mockNotifyHuddleLeave).toHaveBeenCalledTimes(1);
  });

  test("participant count updates when connected", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    expect(screen.getByText("1 participant")).toBeTruthy();
  });

  test("camera permission denied shows alert", async () => {
    mockSetCameraEnabled.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    expect(screen.getByTestId("permission-alert")).toBeTruthy();
    expect(screen.getByText(/camera blocked/i)).toBeTruthy();
  });

  test("permission alert can be dismissed", async () => {
    mockSetCameraEnabled.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    expect(screen.getByTestId("permission-alert")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("permission-alert-ok"));
    });

    expect(screen.queryByTestId("permission-alert")).toBeNull();
  });

  test("screen share cancel — no alert shown", async () => {
    mockSetScreenShareEnabled.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });

    const shareBtn = screen.getByTestId("huddle-screenshare-toggle");
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    // User cancelled the picker — no alert
    expect(screen.queryByTestId("permission-alert")).toBeNull();
  });

  test("mute button shows correct state", async () => {
    mockIsMicrophoneEnabled = false;

    await act(async () => {
      render(<HuddlePage />);
    });

    const muteBtn = screen.getByTestId("huddle-mute-toggle");
    expect(muteBtn.className).toContain("bg-red-500");
  });

  test("camera button shows correct state", async () => {
    mockIsCameraEnabled = false;

    await act(async () => {
      render(<HuddlePage />);
    });

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    expect(cameraBtn.className).toContain("bg-red-500");
  });
});
