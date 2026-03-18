import { describe, test, expect, afterEach, jest, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, act } from "../test-utils";
import { fireEvent } from "@testing-library/react";

// --- Mocks (must be before component import) ---

// Prevent @stripe/stripe-js side-effect script injection in happy-dom
mock.module("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

mock.module("react-router-dom", () => ({
  useParams: () => ({ channelId: "ch-1" }),
}));

mock.module("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    id: "user-1",
    displayName: "Test User",
    getAuthJson: async () => ({ accessToken: "tok" }),
  }),
}));

const _realApiClient = require("../lib/api-client");
mock.module("../lib/api-client", () => ({
  ..._realApiClient,
  authorizedHeaders: async () => ({ Authorization: "Bearer tok" }),
}));

mock.module("../env", () => ({
  env: { VITE_API_URL: "http://localhost:3001" },
}));

const mockSubscribe = jest.fn(() => jest.fn());
const mockConnect = jest.fn(async () => {});
const mockEnableMicrophone = jest.fn(async () => {});
const mockDestroy = jest.fn();
const mockToggleMicrophone = jest.fn(async () => {});
const mockToggleCamera = jest.fn(async () => {});
const mockStartScreenShare = jest.fn(async () => {});
const mockStopScreenShare = jest.fn(async () => {});

mock.module("@openslaq/huddle/client", () => ({
  HuddleClient: class {
    subscribe = mockSubscribe;
    connect = mockConnect;
    enableMicrophone = mockEnableMicrophone;
    destroy = mockDestroy;
    toggleMicrophone = mockToggleMicrophone;
    toggleCamera = mockToggleCamera;
    startScreenShare = mockStartScreenShare;
    stopScreenShare = mockStopScreenShare;
    switchAudioDevice = jest.fn(async () => {});
    getState = () => ({ localParticipant: null, participants: [] });
  },
}));

mock.module("../components/ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Provide browser APIs needed by VideoTile / DeviceSelector in happy-dom
class MockMediaStream {
  tracks: unknown[];
  constructor(tracks?: unknown[]) { this.tracks = tracks ?? []; }
}
(globalThis as unknown as { MediaStream: unknown }).MediaStream = MockMediaStream;
Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
  set(value: unknown) { (this as unknown as { _srcObject: unknown })._srcObject = value; },
  get() { return (this as unknown as { _srcObject: unknown })._srcObject ?? null; },
  configurable: true,
});
Object.defineProperty(navigator, "mediaDevices", {
  value: { enumerateDevices: async () => [] },
  configurable: true,
});

import { HuddlePage } from "./HuddlePage";

function fullParticipant(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    isMuted: false,
    isCameraOn: false,
    isScreenSharing: false,
    isSpeaking: false,
    cameraTrack: null,
    screenTrack: null,
    ...overrides,
  };
}

// --- Tests ---

describe("HuddlePage", () => {
  let fetchSpy: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    fetchSpy = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ token: "lk-token", wsUrl: "ws://localhost" }),
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    mockSubscribe.mockClear();
    mockConnect.mockClear();
    mockEnableMicrophone.mockClear();
    mockDestroy.mockClear();
    mockToggleMicrophone.mockClear();
    mockToggleCamera.mockClear();
    mockStartScreenShare.mockClear();
    mockStopScreenShare.mockClear();
  });

  afterEach(cleanup);

  test("passes AbortController signal to fetch", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callArgs = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  test("cleanup aborts fetch and destroys client", async () => {
    let capturedSignal: AbortSignal | undefined;
    fetchSpy.mockImplementation((_url: string, init: RequestInit) => {
      capturedSignal = init.signal as AbortSignal;
      // Return a promise that never resolves to simulate in-flight request
      return new Promise(() => {});
    });

    let unmount: () => void;
    await act(async () => {
      const result = render(<HuddlePage />);
      unmount = result.unmount;
    });

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal!.aborted).toBe(false);

    // Unmount triggers cleanup (simulates StrictMode first-mount teardown)
    await act(async () => {
      unmount!();
    });

    expect(capturedSignal!.aborted).toBe(true);
    expect(mockDestroy).toHaveBeenCalled();
  });

  test("aborted fetch does not set error state", async () => {
    fetchSpy.mockImplementation((_url: string, init: RequestInit) => {
      // Immediately abort and reject like a real aborted fetch
      const signal = init.signal as AbortSignal;
      return new Promise((_, reject) => {
        if (signal.aborted) {
          reject(new DOMException("The operation was aborted.", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    let unmount: () => void;
    await act(async () => {
      const result = render(<HuddlePage />);
      unmount = result.unmount;
    });

    // Unmount aborts the request
    await act(async () => {
      unmount!();
    });

    // Re-render to verify no error state leaked
    await act(async () => {
      render(<HuddlePage />);
    });

    // Should show connecting state, not error
    expect(screen.queryByText(/failed/i)).toBeNull();
  });

  test("renders connecting state initially", async () => {
    // Fetch never resolves
    fetchSpy.mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<HuddlePage />);
    });

    expect(screen.getByText("Connecting...")).toBeTruthy();
  });

  // ── New tests ──────────────────────────────────────────────────

  test("successful join calls connect and enableMicrophone", async () => {
    await act(async () => {
      render(<HuddlePage />);
    });

    // Wait for async join flow
    await act(() => Promise.resolve());

    expect(mockConnect).toHaveBeenCalledWith("ws://localhost", "lk-token");
    expect(mockEnableMicrophone).toHaveBeenCalled();
  });

  test("fetch error shows error text", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Room not found" }),
    });

    await act(async () => {
      render(<HuddlePage />);
    });

    // Wait for async flow to complete
    await act(() => Promise.resolve());

    expect(screen.getByText("Room not found")).toBeTruthy();
  });

  test("connection error shows error state", async () => {
    mockConnect.mockRejectedValue(new Error("Connection failed"));

    await act(async () => {
      render(<HuddlePage />);
    });

    await act(() => Promise.resolve());

    // LiveKit connection failure is non-fatal (degraded mode), should not show error
    // The error state is only set for fetch failures
    expect(screen.queryByText("Connection failed")).toBeNull();
  });

  test("mute toggle calls toggleMicrophone", async () => {
    // Let subscribe invoke the callback to set mediaState
    (mockSubscribe as jest.Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return jest.fn();
    });

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const muteBtn = screen.getByTestId("huddle-mute-toggle");
    await act(async () => {
      fireEvent.click(muteBtn);
    });

    expect(mockToggleMicrophone).toHaveBeenCalled();
  });

  test("camera toggle calls toggleCamera", async () => {
    (mockSubscribe as jest.Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return jest.fn();
    });

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    expect(mockToggleCamera).toHaveBeenCalled();
  });

  test("screen share toggle calls startScreenShare", async () => {
    (mockSubscribe as jest.Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return jest.fn();
    });

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const shareBtn = screen.getByTestId("huddle-screenshare-toggle");
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(mockStartScreenShare).toHaveBeenCalled();
  });

  test("leave button calls destroy", async () => {
    (mockSubscribe as jest.Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return jest.fn();
    });

    // Mock window.close to prevent errors
    const closeSpy = jest.fn();
    window.close = closeSpy;

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const leaveBtn = screen.getByTestId("huddle-leave");
    await act(async () => {
      fireEvent.click(leaveBtn);
    });

    expect(mockDestroy).toHaveBeenCalled();
  });

  test("participant count updates when mediaState changes", async () => {
    (mockSubscribe as jest.Mock).mockImplementation((cb: Function) => {
      cb({
        localParticipant: fullParticipant(),
        participants: [fullParticipant({ userId: "remote-1" })],
      });
      return jest.fn();
    });

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    expect(screen.getByText("2 participants")).toBeTruthy();
  });
});
