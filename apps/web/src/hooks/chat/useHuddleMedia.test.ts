import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "../../test-utils";

// --- Mocks ---

const mockDispatch = vi.fn();
vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { currentHuddleChannelId: "ch-1" },
    dispatch: mockDispatch,
  }),
}));

const mockUser = {
  id: "user-1",
  displayName: "Test User",
  getAuthJson: async () => ({ accessToken: "tok" }),
};
vi.mock("../useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

vi.mock("../../lib/api-client", () => ({
  authorizedHeaders: async () => ({ Authorization: "Bearer tok" }),
}));

vi.mock("../../env", () => ({
  env: { VITE_API_URL: "http://localhost:3001" },
}));

const mockSubscribe = vi.fn(() => vi.fn());
const mockConnect = vi.fn(async () => {});
const mockEnableMicrophone = vi.fn(async () => {});
const mockDestroy = vi.fn();
const mockToggleMicrophone = vi.fn(async () => {});
const mockToggleCamera = vi.fn(async () => {});
const mockStartScreenShare = vi.fn(async () => {});
const mockStopScreenShare = vi.fn(async () => {});
const mockSwitchAudioDevice = vi.fn(async () => {});
const mockSwitchVideoDevice = vi.fn(async () => {});
const mockGetState = vi.fn((): { localParticipant: Record<string, unknown> | null; participants: unknown[] } => ({ localParticipant: null, participants: [] }));

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
    switchAudioDevice = mockSwitchAudioDevice;
    switchVideoDevice = mockSwitchVideoDevice;
    getState = mockGetState;
  },
}));

import { useHuddleMedia } from "./useHuddleMedia";

// --- Helpers ---

let fetchSpy: ReturnType<typeof vi.fn>;

function setupFetchSuccess() {
  fetchSpy = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ token: "lk-token", wsUrl: "ws://localhost" }),
    }),
  );
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
}

function notAllowedError(message = "Permission denied") {
  return new DOMException(message, "NotAllowedError");
}

function notFoundError(message = "Requested device not found") {
  return new DOMException(message, "NotFoundError");
}

function notReadableError(message = "Could not start audio source") {
  return new DOMException(message, "NotReadableError");
}

// --- Tests ---

describe("useHuddleMedia", () => {
  beforeEach(() => {
    setupFetchSuccess();
    vi.clearAllMocks();
    // Reset mockSubscribe to default (some tests override it)
    mockSubscribe.mockImplementation(() => vi.fn());
  });
  afterEach(cleanup);

  // ── Joining: Microphone Permission Scenarios ────────────────

  describe("joining a huddle", () => {
    test("scenario 1: mic permission granted — joins unmuted", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(mockConnect).toHaveBeenCalled();
      expect(mockEnableMicrophone).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.isMuted).toBe(false);
    });

    test("scenario 3: mic permission denied on join — joins muted, no error", async () => {
      mockEnableMicrophone.mockRejectedValueOnce(notAllowedError());

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(mockConnect).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.isMuted).toBe(true);
      // Should NOT leave the huddle
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "huddle/setCurrentChannel", channelId: null }),
      );
    });

    test("scenario 4: mic permission previously blocked — joins muted, no error", async () => {
      // Previously blocked behaves identically to freshly denied
      mockEnableMicrophone.mockRejectedValueOnce(notAllowedError("Permission denied"));

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(result.current.error).toBeNull();
      expect(result.current.isMuted).toBe(true);
    });

    test("scenario 5: no mic device — joins muted, no error", async () => {
      mockEnableMicrophone.mockRejectedValueOnce(notFoundError());

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(result.current.error).toBeNull();
      expect(result.current.isMuted).toBe(true);
    });

    test("scenario 6: mic in use by another app — joins muted, no error", async () => {
      mockEnableMicrophone.mockRejectedValueOnce(notReadableError());

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(result.current.error).toBeNull();
      expect(result.current.isMuted).toBe(true);
    });

    test("API error still shows error and leaves huddle", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not a channel member" }),
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(result.current.error).toBe("Not a channel member");
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "huddle/setCurrentChannel", channelId: null }),
      );
    });
  });

  // ── Toggling Microphone ─────────────────────────────────────

  describe("toggling microphone", () => {
    test("scenario 7: toggle succeeds — state updates via subscription", async () => {
      let subscribeCb!: Function;
      (mockSubscribe as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => {
        subscribeCb = cb;
        return vi.fn();
      });

      mockToggleMicrophone.mockImplementation(async () => {
        subscribeCb({
          localParticipant: {
            userId: "user-1", isMuted: true, isCameraOn: false,
            isScreenSharing: false, isSpeaking: false, cameraTrack: null, screenTrack: null,
          },
          participants: [],
        });
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.toggleMute();
      });

      expect(mockToggleMicrophone).toHaveBeenCalled();
      expect(result.current.isMuted).toBe(true);
    });

    test("scenario 8: mic permission previously denied — shows alert, button does NOT toggle", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      mockToggleMicrophone.mockRejectedValueOnce(notAllowedError());

      await act(async () => {
        result.current.toggleMute();
      });

      // Button should NOT have toggled
      expect(result.current.isMuted).toBe(false);
      // Alert should be shown
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/microphone/i),
        }),
      );
    });

    test("scenario 9: no mic device — shows alert, button does NOT toggle", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      mockToggleMicrophone.mockRejectedValueOnce(notFoundError());

      await act(async () => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(false);
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/microphone/i),
          description: expect.stringMatching(/connect/i),
        }),
      );
    });

    test("scenario 10: mic in use — shows alert, button does NOT toggle", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      mockToggleMicrophone.mockRejectedValueOnce(notReadableError());

      await act(async () => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(false);
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/microphone/i),
          description: expect.stringMatching(/another app/i),
        }),
      );
    });
  });

  // ── Toggling Camera ─────────────────────────────────────────

  describe("toggling camera", () => {
    test("scenario 11: camera on succeeds — state updates via subscription", async () => {
      let subscribeCb!: Function;
      (mockSubscribe as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => {
        subscribeCb = cb;
        return vi.fn();
      });

      mockToggleCamera.mockImplementation(async () => {
        subscribeCb({
          localParticipant: {
            userId: "user-1", isMuted: false, isCameraOn: true,
            isScreenSharing: false, isSpeaking: false, cameraTrack: null, screenTrack: null,
          },
          participants: [],
        });
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.toggleCamera();
      });

      expect(mockToggleCamera).toHaveBeenCalled();
      expect(result.current.isCameraOn).toBe(true);
    });

    test("scenario 13: camera permission denied — shows alert, button does NOT toggle", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      mockToggleCamera.mockRejectedValueOnce(notAllowedError());

      await act(async () => {
        result.current.toggleCamera();
      });

      expect(result.current.isCameraOn).toBe(false);
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/camera/i),
          description: expect.stringMatching(/browser settings/i),
        }),
      );
    });

    test("scenario 14: camera permission previously blocked — shows alert, button does NOT toggle", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      mockToggleCamera.mockRejectedValueOnce(notAllowedError("Permission denied"));

      await act(async () => {
        result.current.toggleCamera();
      });

      expect(result.current.isCameraOn).toBe(false);
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/camera/i),
        }),
      );
    });

    test("scenario 15: no camera device — shows alert, button does NOT toggle", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      mockToggleCamera.mockRejectedValueOnce(notFoundError("Requested device not found"));

      await act(async () => {
        result.current.toggleCamera();
      });

      expect(result.current.isCameraOn).toBe(false);
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/camera/i),
          description: expect.stringMatching(/connect/i),
        }),
      );
    });

    test("scenario 16: turning camera off always succeeds", async () => {
      // Simulate camera already on via LiveKit state
      (mockSubscribe as import("vitest").Mock).mockImplementation((cb: Function) => {
        cb({
          localParticipant: {
            userId: "user-1",
            isMuted: false,
            isCameraOn: true,
            isScreenSharing: false,
            isSpeaking: false,
            cameraTrack: null,
            screenTrack: null,
          },
          participants: [],
        });
        return vi.fn();
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      expect(result.current.isCameraOn).toBe(true);

      await act(async () => {
        result.current.toggleCamera();
      });

      expect(mockToggleCamera).toHaveBeenCalled();
    });
  });

  // ── Screen Share ────────────────────────────────────────────

  describe("toggling screen share", () => {
    test("scenario 17: screen share succeeds — state updates via subscription", async () => {
      let subscribeCb!: Function;
      (mockSubscribe as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => {
        subscribeCb = cb;
        return vi.fn();
      });

      mockStartScreenShare.mockImplementation(async () => {
        subscribeCb({
          localParticipant: {
            userId: "user-1", isMuted: false, isCameraOn: false,
            isScreenSharing: true, isSpeaking: false, cameraTrack: null, screenTrack: null,
          },
          participants: [],
        });
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        await result.current.toggleScreenShare();
      });

      expect(mockStartScreenShare).toHaveBeenCalled();
      expect(result.current.isScreenSharing).toBe(true);
    });

    test("scenario 18: user cancels screen picker — no alert, button does NOT toggle", async () => {
      mockStartScreenShare.mockRejectedValueOnce(notAllowedError("Permission denied"));

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.toggleScreenShare();
      });

      expect(result.current.isScreenSharing).toBe(false);
      // No alert for user-initiated cancellation
      expect(result.current.permissionAlert).toBeNull();
    });

    test("scenario 19: screen share blocked by browser policy — shows alert, button does NOT toggle", async () => {
      // SecurityError or other non-NotAllowedError indicates a policy block
      mockStartScreenShare.mockRejectedValueOnce(
        new DOMException("Screen sharing not allowed", "SecurityError"),
      );

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.toggleScreenShare();
      });

      expect(result.current.isScreenSharing).toBe(false);
      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/screen sharing/i),
        }),
      );
    });

    test("scenario 20: stop screen share always succeeds", async () => {
      mockGetState.mockReturnValue({
        localParticipant: { isScreenSharing: true },
        participants: [],
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.toggleScreenShare();
      });

      expect(mockStopScreenShare).toHaveBeenCalled();
    });
  });

  // ── Device Switching ────────────────────────────────────────

  describe("switching devices", () => {
    test("scenario 21: switch audio device succeeds", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.switchAudioDevice("device-2");
      });

      expect(mockSwitchAudioDevice).toHaveBeenCalledWith("device-2");
      expect(result.current.permissionAlert).toBeNull();
    });

    test("scenario 22: switch audio device fails — shows alert", async () => {
      mockSwitchAudioDevice.mockRejectedValueOnce(new Error("Device not available"));

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.switchAudioDevice("device-2");
      });

      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/switch/i),
        }),
      );
    });

    test("scenario 23: switch video device succeeds", async () => {
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.switchVideoDevice("device-3");
      });

      expect(mockSwitchVideoDevice).toHaveBeenCalledWith("device-3");
      expect(result.current.permissionAlert).toBeNull();
    });

    test("scenario 24: switch video device fails — shows alert", async () => {
      mockSwitchVideoDevice.mockRejectedValueOnce(new Error("Device not available"));

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.switchVideoDevice("device-3");
      });

      expect(result.current.permissionAlert).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/switch/i),
        }),
      );
    });
  });

  // ── Alert dismissal ─────────────────────────────────────────

  describe("alert dismissal", () => {
    test("dismissPermissionAlert clears the alert", async () => {
      mockToggleCamera.mockRejectedValueOnce(notAllowedError());

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      await act(async () => {
        result.current.toggleCamera();
      });
      expect(result.current.permissionAlert).not.toBeNull();

      act(() => {
        result.current.dismissPermissionAlert();
      });
      expect(result.current.permissionAlert).toBeNull();
    });
  });

  // ── State sync: controls must match LiveKit ground truth ───

  describe("control state sync with LiveKit", () => {
    function fp(overrides: Record<string, unknown> = {}) {
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

    function setupSubscriptionCapture() {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fp> | null; participants: unknown[] }) => void;
      (mockSubscribe as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });
      return { getCb: () => subscribeCb };
    }

    test("on disconnect, isMuted reflects last LiveKit state, not stale localMuted", async () => {
      const { getCb } = setupSubscriptionCapture();
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());
      const cb = getCb();

      // Connected, unmuted
      act(() => cb({ localParticipant: fp({ isMuted: false }), participants: [] }));
      expect(result.current.isMuted).toBe(false);

      // Toggle mute → localMuted flips to true
      await act(async () => { result.current.toggleMute(); });

      // External unmute (e.g. admin action) — LiveKit says unmuted
      act(() => cb({ localParticipant: fp({ isMuted: false }), participants: [] }));
      expect(result.current.isMuted).toBe(false);

      // Disconnect — localParticipant becomes null, falls back to localMuted
      act(() => cb({ localParticipant: null, participants: [] }));

      // Should reflect last known LiveKit state (unmuted), not stale localMuted (muted)
      expect(result.current.isMuted).toBe(false);
    });

    test("on disconnect, isCameraOn reflects last LiveKit state, not stale localCameraOn", async () => {
      const { getCb } = setupSubscriptionCapture();
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());
      const cb = getCb();

      // Connected, camera off
      act(() => cb({ localParticipant: fp({ isCameraOn: false }), participants: [] }));
      expect(result.current.isCameraOn).toBe(false);

      // Toggle camera on → localCameraOn flips to true
      await act(async () => { result.current.toggleCamera(); });

      // External camera off (e.g. admin action)
      act(() => cb({ localParticipant: fp({ isCameraOn: false }), participants: [] }));
      expect(result.current.isCameraOn).toBe(false);

      // Disconnect
      act(() => cb({ localParticipant: null, participants: [] }));

      // Should reflect last known LiveKit state (off), not stale localCameraOn (on)
      expect(result.current.isCameraOn).toBe(false);
    });

    test("on disconnect, isScreenSharing reflects last LiveKit state, not stale localScreenSharing", async () => {
      const { getCb } = setupSubscriptionCapture();
      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());
      const cb = getCb();

      // Connected, not sharing
      act(() => cb({ localParticipant: fp({ isScreenSharing: false }), participants: [] }));
      expect(result.current.isScreenSharing).toBe(false);

      // Start screen share → localScreenSharing set to true
      mockGetState.mockReturnValue({ localParticipant: { isScreenSharing: false }, participants: [] });
      await act(async () => { result.current.toggleScreenShare(); });

      // External stop (e.g. admin action)
      act(() => cb({ localParticipant: fp({ isScreenSharing: false }), participants: [] }));
      expect(result.current.isScreenSharing).toBe(false);

      // Disconnect
      act(() => cb({ localParticipant: null, participants: [] }));

      // Should reflect last known LiveKit state (not sharing), not stale localScreenSharing (sharing)
      expect(result.current.isScreenSharing).toBe(false);
    });
  });

  // ── Race conditions ────────────────────────────────────────

  describe("race conditions", () => {
    function fp(overrides: Record<string, unknown> = {}) {
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

    test("rapid mute toggles: final state matches LiveKit, not accumulated flips", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fp> | null; participants: unknown[] }) => void;
      (mockSubscribe as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      // First toggle resolves slowly, second resolves immediately
      let resolveFirst!: () => void;
      mockToggleMicrophone
        .mockImplementationOnce(() => new Promise<void>((r) => { resolveFirst = r; }))
        .mockImplementationOnce(async () => {});

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      // Start with LiveKit showing unmuted
      act(() => subscribeCb({ localParticipant: fp({ isMuted: false }), participants: [] }));

      // First toggle starts (hangs on await)
      act(() => { result.current.toggleMute(); });

      // Second toggle starts and completes (localMuted flips once: false → true)
      await act(async () => { result.current.toggleMute(); });

      // First toggle now completes (localMuted flips again: true → false)
      await act(async () => { resolveFirst(); });

      // LiveKit sees two toggles: unmuted → muted → unmuted. Final LiveKit state = unmuted.
      act(() => subscribeCb({ localParticipant: fp({ isMuted: false }), participants: [] }));

      // Now disconnect to expose localMuted
      act(() => subscribeCb({ localParticipant: null, participants: [] }));

      // localMuted should match LiveKit's final state (false/unmuted)
      // BUG: localMuted accumulated two blind flips and may be wrong
      expect(result.current.isMuted).toBe(false);
    });
  });

  // ── Error recovery ─────────────────────────────────────────

  describe("error recovery", () => {
    function fp(overrides: Record<string, unknown> = {}) {
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

    test("after toggle failure, state matches LiveKit not optimistic flip", async () => {
      let subscribeCb!: (s: { localParticipant: ReturnType<typeof fp> | null; participants: unknown[] }) => void;
      (mockSubscribe as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result } = renderHook(() => useHuddleMedia());
      await act(() => Promise.resolve());

      // Connected, unmuted
      act(() => subscribeCb({ localParticipant: fp({ isMuted: false }), participants: [] }));
      expect(result.current.isMuted).toBe(false);

      // Toggle fails
      mockToggleMicrophone.mockRejectedValueOnce(notAllowedError());
      await act(async () => { result.current.toggleMute(); });

      // State should still be unmuted (toggle failed, LiveKit didn't change)
      expect(result.current.isMuted).toBe(false);

      // Dismiss alert and try again — this time succeeds
      act(() => { result.current.dismissPermissionAlert(); });

      // LiveKit subscription confirms muted
      mockToggleMicrophone.mockImplementationOnce(async () => {
        subscribeCb({ localParticipant: fp({ isMuted: true }), participants: [] });
      });
      await act(async () => { result.current.toggleMute(); });

      // Should now be muted
      expect(result.current.isMuted).toBe(true);

      // Disconnect — should remember muted, not some stale value
      act(() => subscribeCb({ localParticipant: null, participants: [] }));
      expect(result.current.isMuted).toBe(true);
    });
  });
});
