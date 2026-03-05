import { describe, test, expect, afterEach, jest, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, act } from "../test-utils";

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

mock.module("../lib/api-client", () => ({
  authorizedHeaders: async () => ({ Authorization: "Bearer tok" }),
}));

mock.module("../env", () => ({
  env: { VITE_API_URL: "http://localhost:3001" },
}));

const mockSubscribe = jest.fn(() => jest.fn());
const mockConnect = jest.fn(async () => {});
const mockEnableMicrophone = jest.fn(async () => {});
const mockDestroy = jest.fn();

mock.module("@openslaq/huddle/client", () => ({
  HuddleClient: class {
    subscribe = mockSubscribe;
    connect = mockConnect;
    enableMicrophone = mockEnableMicrophone;
    destroy = mockDestroy;
    toggleMicrophone = jest.fn(async () => {});
    toggleCamera = jest.fn(async () => {});
    startScreenShare = jest.fn(async () => {});
    stopScreenShare = jest.fn(async () => {});
    switchAudioDevice = jest.fn(async () => {});
    getState = () => ({ localParticipant: null, participants: [] });
  },
}));

mock.module("../components/huddle/VideoGrid", () => ({
  VideoGrid: () => <div data-testid="video-grid" />,
}));

mock.module("../components/huddle/DeviceSelector", () => ({
  DeviceSelector: () => <div data-testid="device-selector" />,
}));

mock.module("../components/ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { HuddlePage } from "./HuddlePage";

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
});
