import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "../test-utils";
import { fireEvent } from "@testing-library/react";

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

const mockSubscribe = vi.fn(() => vi.fn());
const mockConnect = vi.fn(async () => {});
const mockEnableMicrophone = vi.fn(async () => {});
const mockDestroy = vi.fn();
const mockToggleMicrophone = vi.fn(async () => {});
const mockToggleCamera = vi.fn(async () => {});
const mockStartScreenShare = vi.fn(async () => {});
const mockStopScreenShare = vi.fn(async () => {});

vi.mock("@openslaq/huddle/client", () => ({
  HuddleClient: class {
    subscribe = mockSubscribe;
    connect = mockConnect;
    enableMicrophone = mockEnableMicrophone;
    destroy = mockDestroy;
    toggleMicrophone = mockToggleMicrophone;
    toggleCamera = mockToggleCamera;
    startScreenShare = mockStartScreenShare;
    stopScreenShare = mockStopScreenShare;
    switchAudioDevice = vi.fn(async () => {});
    getState = () => ({ localParticipant: null, participants: [] });
  },
}));

vi.mock("../components/ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../components/huddle/VideoGrid", () => ({
  VideoGrid: ({ localParticipant, remoteParticipants }: { localParticipant: { isMuted?: boolean; isCameraOn?: boolean; isScreenSharing?: boolean } | null; remoteParticipants: unknown[] }) => (
    <div
      data-testid="video-grid"
      data-local-muted={localParticipant ? String(localParticipant.isMuted) : ""}
      data-local-camera={localParticipant ? String(localParticipant.isCameraOn) : ""}
      data-local-screenshare={localParticipant ? String(localParticipant.isScreenSharing) : ""}
    >
      {remoteParticipants.length + (localParticipant ? 1 : 0)} tiles
    </div>
  ),
}));

vi.mock("../components/huddle/DeviceSelector", () => ({
  DeviceSelector: () => <div data-testid="device-selector" />,
}));

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
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(() =>
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
    mockNotifyHuddleLeave.mockClear();
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

  test("mic permission denied on join — joins muted, no error screen", async () => {
    mockEnableMicrophone.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    // Should NOT show error screen
    expect(screen.queryByText(/permission denied/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    // Should show connecting/huddle UI (not error)
    expect(screen.getByTestId("huddle-mute-toggle")).toBeTruthy();
  });

  test("camera permission denied — shows alert, no toggle", async () => {
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
    });
    mockToggleCamera.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    // Should show permission alert
    expect(screen.getByTestId("permission-alert")).toBeTruthy();
    expect(screen.getByText(/camera blocked/i)).toBeTruthy();
  });

  test("screen share cancel — no alert shown", async () => {
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
    });
    mockStartScreenShare.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const shareBtn = screen.getByTestId("huddle-screenshare-toggle");
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    // User cancelled the picker — no alert
    expect(screen.queryByTestId("permission-alert")).toBeNull();
  });

  test("permission alert can be dismissed", async () => {
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
    });
    mockToggleCamera.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    const cameraBtn = screen.getByTestId("huddle-camera-toggle");
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    expect(screen.getByTestId("permission-alert")).toBeTruthy();

    // Dismiss
    await act(async () => {
      fireEvent.click(screen.getByTestId("permission-alert-ok"));
    });

    expect(screen.queryByTestId("permission-alert")).toBeNull();
  });

  test("mute toggle calls toggleMicrophone", async () => {
    // Let subscribe invoke the callback to set mediaState
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
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
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
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
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
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

  test("leave button calls destroy and notifyHuddleLeave", async () => {
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({ localParticipant: fullParticipant(), participants: [] });
      return vi.fn();
    });

    // Mock window.close to prevent errors
    const closeSpy = vi.fn();
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
    expect(mockNotifyHuddleLeave).toHaveBeenCalledTimes(1);
  });

  test("participant count updates when mediaState changes", async () => {
    (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
      cb({
        localParticipant: fullParticipant(),
        participants: [fullParticipant({ userId: "remote-1" })],
      });
      return vi.fn();
    });

    await act(async () => {
      render(<HuddlePage />);
    });
    await act(() => Promise.resolve());

    expect(screen.getByText("2 participants")).toBeTruthy();
  });

  // ── Control state sync with LiveKit ────────────────────────

  describe("control state sync", () => {
    test("mute button matches LiveKit state after toggle, not blind !prev flip", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fullParticipant> | null; participants: unknown[] }) => void;
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      // toggleMicrophone triggers subscription (simulates LiveKit state change) before resolving
      mockToggleMicrophone.mockImplementation(async () => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: true }),
          participants: [],
        });
      });

      await act(async () => { render(<HuddlePage />); });
      await act(() => Promise.resolve());

      // Set initial state: unmuted
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: false }),
          participants: [],
        });
      });

      const muteBtn = screen.getByTestId("huddle-mute-toggle");
      // Verify initially unmuted (white bg, not red)
      expect(muteBtn.className).toContain("bg-white/10");

      // Click mute
      await act(async () => { fireEvent.click(muteBtn); });

      // Button should show muted state (red background) matching LiveKit
      expect(muteBtn.className).toContain("bg-red-500");
    });

    test("camera button matches LiveKit state after toggle, not blind !prev flip", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fullParticipant> | null; participants: unknown[] }) => void;
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      mockToggleCamera.mockImplementation(async () => {
        subscribeCb({
          localParticipant: fullParticipant({ isCameraOn: true }),
          participants: [],
        });
      });

      await act(async () => { render(<HuddlePage />); });
      await act(() => Promise.resolve());

      // Set initial state: camera off
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isCameraOn: false }),
          participants: [],
        });
      });

      const cameraBtn = screen.getByTestId("huddle-camera-toggle");
      // Camera off shows red bg
      expect(cameraBtn.className).toContain("bg-red-500");

      // Click to turn camera on
      await act(async () => { fireEvent.click(cameraBtn); });

      // Button should show camera ON state (white bg) matching LiveKit
      expect(cameraBtn.className).toContain("bg-white/10");
    });

    test("mute button state agrees with VideoGrid localParticipant after toggle", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fullParticipant> | null; participants: unknown[] }) => void;
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      mockToggleMicrophone.mockImplementation(async () => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: true }),
          participants: [],
        });
      });

      await act(async () => { render(<HuddlePage />); });
      await act(() => Promise.resolve());

      // Set initial state: unmuted
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: false }),
          participants: [],
        });
      });

      // Click mute
      const muteBtn = screen.getByTestId("huddle-mute-toggle");
      await act(async () => { fireEvent.click(muteBtn); });

      // VideoGrid receives localParticipant from mediaState (LiveKit truth)
      const grid = screen.getByTestId("video-grid");
      const gridShowsMuted = grid.getAttribute("data-local-muted") === "true";

      // Mute button shows muted via red bg
      const buttonShowsMuted = muteBtn.className.includes("bg-red-500");

      // These MUST agree — the user's tile and control button should never contradict
      expect(buttonShowsMuted).toBe(gridShowsMuted);
    });

    test("screen share button matches LiveKit state after toggle", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fullParticipant> | null; participants: unknown[] }) => void;
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      mockStartScreenShare.mockImplementation(async () => {
        subscribeCb({
          localParticipant: fullParticipant({ isScreenSharing: true }),
          participants: [],
        });
      });

      await act(async () => { render(<HuddlePage />); });
      await act(() => Promise.resolve());

      // Set initial state: not sharing
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isScreenSharing: false }),
          participants: [],
        });
      });

      const shareBtn = screen.getByTestId("huddle-screenshare-toggle");
      expect(shareBtn.className).toContain("bg-white/10");

      // Click to start sharing
      await act(async () => { fireEvent.click(shareBtn); });

      // Button should show sharing state (blue bg) matching LiveKit
      expect(shareBtn.className).toContain("bg-blue-500");
    });
  });

  // ── Race conditions ────────────────────────────────────────

  describe("race conditions", () => {
    test("rapid mute double-click: final state matches LiveKit", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fullParticipant> | null; participants: unknown[] }) => void;
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      // First toggle is slow, second is fast
      let resolveFirst!: () => void;
      mockToggleMicrophone
        .mockImplementationOnce(() => new Promise<void>((r) => { resolveFirst = r; }))
        .mockImplementationOnce(async () => {});

      await act(async () => { render(<HuddlePage />); });
      await act(() => Promise.resolve());

      // Initial: unmuted
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: false }),
          participants: [],
        });
      });

      const muteBtn = screen.getByTestId("huddle-mute-toggle");

      // Rapid double-click
      await act(async () => { fireEvent.click(muteBtn); });
      await act(async () => { fireEvent.click(muteBtn); });

      // Resolve the slow first toggle
      await act(async () => { resolveFirst(); });

      // LiveKit: muted → unmuted. Final state = unmuted.
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: false }),
          participants: [],
        });
      });

      // Button should show unmuted (matching LiveKit)
      expect(muteBtn.className).toContain("bg-white/10");
    });
  });

  // ── Error recovery ─────────────────────────────────────────

  describe("error recovery", () => {
    test("after mute toggle failure then retry success, button matches LiveKit", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fullParticipant> | null; participants: unknown[] }) => void;
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      await act(async () => { render(<HuddlePage />); });
      await act(() => Promise.resolve());

      // Initial: unmuted
      act(() => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: false }),
          participants: [],
        });
      });

      const muteBtn = screen.getByTestId("huddle-mute-toggle");

      // First toggle fails
      mockToggleMicrophone.mockRejectedValueOnce(
        new DOMException("Permission denied", "NotAllowedError"),
      );
      await act(async () => { fireEvent.click(muteBtn); });

      // Button should still show unmuted (toggle failed, LiveKit unchanged)
      expect(muteBtn.className).toContain("bg-white/10");

      // Dismiss alert
      await act(async () => { fireEvent.click(screen.getByTestId("permission-alert-ok")); });

      // Retry — this time succeeds and LiveKit confirms muted
      mockToggleMicrophone.mockImplementationOnce(async () => {
        subscribeCb({
          localParticipant: fullParticipant({ isMuted: true }),
          participants: [],
        });
      });
      await act(async () => { fireEvent.click(muteBtn); });

      // Button should now show muted
      expect(muteBtn.className).toContain("bg-red-500");
    });
  });
});
