import { renderHook, act } from "@testing-library/react-native";

// Track listener registrations
type ListenerCallback = (...args: any[]) => void;
const listeners: Record<string, ListenerCallback> = {};
const mockRemove = jest.fn();
const mockEndCall = jest.fn();
const mockReportCallConnected = jest.fn();

jest.mock("@/lib/voip-native", () => ({
  isVoipAvailable: true,
  getVoipEmitter: () => ({
    addListener: (event: string, callback: ListenerCallback) => {
      listeners[event] = callback;
      return { remove: mockRemove };
    },
  }),
  endCall: (...args: unknown[]) => mockEndCall(...args),
  reportCallConnected: (...args: unknown[]) => mockReportCallConnected(...args),
}));

const mockRegisterVoipToken = jest.fn().mockResolvedValue(undefined);
const mockUnregisterVoipToken = jest.fn().mockResolvedValue(undefined);
jest.mock("@openslaq/client-core", () => ({
  registerVoipToken: (...args: unknown[]) => mockRegisterVoipToken(...args),
  unregisterVoipToken: (...args: unknown[]) => mockUnregisterVoipToken(...args),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/sentry", () => ({
  Sentry: { captureException: jest.fn() },
}));

jest.mock("@/lib/routes", () => ({
  routes: {
    huddle: (ws: string) => `/(app)/${ws}/huddle`,
  },
}));

import { useVoipCallKit } from "../useVoipCallKit";
import { router } from "expo-router";

describe("useVoipCallKit", () => {
  const mockDeps = { api: {} as any, auth: {} as any };
  const mockJoinHuddle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(listeners)) delete listeners[key];
  });

  function renderVoipHook(workspaceSlug: string | null = "test-ws") {
    return renderHook(() =>
      useVoipCallKit({
        deps: mockDeps,
        joinHuddle: mockJoinHuddle,
        huddleChannelId: null,
        workspaceSlug,
      }),
    );
  }

  test("registers event listeners on mount", () => {
    renderVoipHook();
    expect(listeners["voipTokenReceived"]).toBeDefined();
    expect(listeners["callAnswered"]).toBeDefined();
    expect(listeners["callEnded"]).toBeDefined();
  });

  test("removes event listeners on unmount", () => {
    const { unmount } = renderVoipHook();
    unmount();
    expect(mockRemove).toHaveBeenCalledTimes(3);
  });

  test("registers VoIP token when received", async () => {
    renderVoipHook();

    await act(async () => {
      await listeners["voipTokenReceived"]!({ token: "test-voip-token-123" });
    });

    expect(mockRegisterVoipToken).toHaveBeenCalledWith(mockDeps, "test-voip-token-123", "ios");
  });

  test("callAnswered triggers joinHuddle and navigates", () => {
    renderVoipHook("my-workspace");

    act(() => {
      listeners["callAnswered"]!({
        uuid: "call-uuid-123",
        channelId: "channel-456",
        workspaceSlug: "my-workspace",
      });
    });

    expect(mockJoinHuddle).toHaveBeenCalledWith("channel-456");
    expect(router.push).toHaveBeenCalledWith("/(app)/my-workspace/huddle");
  });

  test("callEnded event handled without error", () => {
    renderVoipHook();

    expect(() => {
      act(() => {
        listeners["callEnded"]!({ uuid: "call-uuid-123" });
      });
    }).not.toThrow();
  });

  test("unregisterToken calls unregisterVoipToken", async () => {
    const { result } = renderVoipHook();

    // Receive a token first
    await act(async () => {
      await listeners["voipTokenReceived"]!({ token: "test-voip-token-789" });
    });

    await act(async () => {
      await result.current.unregisterToken();
    });

    expect(mockUnregisterVoipToken).toHaveBeenCalledWith(mockDeps, "test-voip-token-789");
  });

  test("endCall calls native module", () => {
    const { result } = renderVoipHook();

    act(() => {
      result.current.endCall("some-uuid");
    });

    expect(mockEndCall).toHaveBeenCalledWith("some-uuid");
  });

  test("reportCallConnected calls native module", () => {
    const { result } = renderVoipHook();

    act(() => {
      result.current.reportCallConnected("some-uuid");
    });

    expect(mockReportCallConnected).toHaveBeenCalledWith("some-uuid");
  });
});
