import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { ConnectionBanner } from "./ConnectionBanner";
import type { SocketStatus } from "@openslaq/client-core";

let mockSocketStatus: SocketStatus = "connected";
let mockIsOnline = true;

vi.mock("../../hooks/useSocket", () => ({
  useSocket: () => ({ status: mockSocketStatus, socket: null, lastError: null, joinChannel: () => {}, leaveChannel: () => {} }),
}));

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@openslaq/client-core")>();
  return {
    ...actual,
    useOnlineStatus: () => mockIsOnline,
  };
});

describe("ConnectionBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSocketStatus = "connected";
    mockIsOnline = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("renders nothing when connected (steady state)", () => {
    mockSocketStatus = "connected";
    const { container } = render(<ConnectionBanner />);
    expect(container.querySelector("[data-testid='connection-banner']")).toBeNull();
  });

  test("renders nothing when idle", () => {
    mockSocketStatus = "idle";
    const { container } = render(<ConnectionBanner />);
    expect(container.querySelector("[data-testid='connection-banner']")).toBeNull();
  });

  test("shows 'Reconnecting...' when status is reconnecting", () => {
    mockSocketStatus = "reconnecting";
    render(<ConnectionBanner />);
    expect(screen.getByTestId("connection-banner")).toBeTruthy();
    expect(screen.getByText("Reconnecting...")).toBeTruthy();
  });

  test("shows 'Reconnecting...' when status is error", () => {
    mockSocketStatus = "error";
    render(<ConnectionBanner />);
    expect(screen.getByTestId("connection-banner")).toBeTruthy();
    expect(screen.getByText("Reconnecting...")).toBeTruthy();
  });

  test("shows 'You're offline' when navigator.onLine is false", () => {
    mockIsOnline = false;
    mockSocketStatus = "connected";
    render(<ConnectionBanner />);
    expect(screen.getByTestId("connection-banner")).toBeTruthy();
    expect(screen.getByText("You're offline")).toBeTruthy();
  });

  test("offline takes priority over reconnecting", () => {
    mockIsOnline = false;
    mockSocketStatus = "reconnecting";
    render(<ConnectionBanner />);
    expect(screen.getByText("You're offline")).toBeTruthy();
  });

  test("shows 'Connected' after transitioning from reconnecting to connected", () => {
    mockSocketStatus = "reconnecting";
    const { rerender } = render(<ConnectionBanner />);
    expect(screen.getByText("Reconnecting...")).toBeTruthy();

    mockSocketStatus = "connected";
    rerender(<ConnectionBanner />);

    expect(screen.getByText("Connected")).toBeTruthy();
  });

  test("'Connected' banner auto-hides after 3 seconds", () => {
    mockSocketStatus = "reconnecting";
    const { rerender } = render(<ConnectionBanner />);

    mockSocketStatus = "connected";
    rerender(<ConnectionBanner />);
    expect(screen.getByText("Connected")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Force re-render after state update
    rerender(<ConnectionBanner />);
    expect(screen.queryByTestId("connection-banner")).toBeNull();
  });
});
