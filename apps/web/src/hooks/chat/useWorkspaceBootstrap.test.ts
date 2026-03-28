import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "../../test-utils";
import type { SocketStatus } from "@openslaq/client-core";

let mockSocketStatus: SocketStatus = "idle";
const mockBootstrap = vi.fn();
const mockDispatch = vi.fn();

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@openslaq/client-core")>();
  return {
    ...actual,
    bootstrapWorkspace: (...args: unknown[]) => mockBootstrap(...args),
  };
});

vi.mock("../useSocket", () => ({
  useSocket: () => ({ status: mockSocketStatus, socket: null, lastError: null, joinChannel: () => {}, leaveChannel: () => {} }),
}));

vi.mock("../../api", () => ({
  api: {},
}));

const stableAuth = {
  getAccessToken: async () => "token",
  requireAccessToken: async () => "token",
  onAuthRequired: () => {},
};
vi.mock("../../lib/api-client", () => ({
  useAuthProvider: () => stableAuth,
}));

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { channels: [], ui: {} },
    dispatch: mockDispatch,
  }),
}));

vi.mock("../../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
}));

// Import after all mocks
const { useWorkspaceBootstrap } = await import("./useWorkspaceBootstrap");

describe("useWorkspaceBootstrap", () => {
  beforeEach(() => {
    mockSocketStatus = "idle";
    mockBootstrap.mockClear();
    mockDispatch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test("calls bootstrap on mount with workspaceSlug", () => {
    renderHook(() => useWorkspaceBootstrap("test-ws", undefined, undefined));
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
    expect(mockBootstrap).toHaveBeenCalledWith(
      expect.objectContaining({}),
      expect.objectContaining({ workspaceSlug: "test-ws" }),
    );
  });

  test("does not call bootstrap without workspaceSlug", () => {
    renderHook(() => useWorkspaceBootstrap(undefined));
    expect(mockBootstrap).not.toHaveBeenCalled();
  });

  test("re-bootstraps when socket transitions from reconnecting to connected", () => {
    mockSocketStatus = "reconnecting";
    const { rerender } = renderHook(() => useWorkspaceBootstrap("test-ws"));

    // Initial mount bootstrap
    expect(mockBootstrap).toHaveBeenCalledTimes(1);

    // Transition to connected
    mockSocketStatus = "connected";
    rerender();

    // Should have called bootstrap again (re-bootstrap)
    expect(mockBootstrap).toHaveBeenCalledTimes(2);
    expect(mockBootstrap).toHaveBeenLastCalledWith(
      expect.objectContaining({}),
      expect.objectContaining({ workspaceSlug: "test-ws" }),
    );
  });

  test("re-bootstraps when socket transitions from error to connected", () => {
    mockSocketStatus = "error";
    const { rerender } = renderHook(() => useWorkspaceBootstrap("test-ws"));
    expect(mockBootstrap).toHaveBeenCalledTimes(1);

    mockSocketStatus = "connected";
    rerender();

    expect(mockBootstrap).toHaveBeenCalledTimes(2);
  });

  test("does NOT re-bootstrap on idle → connected (initial connect)", () => {
    mockSocketStatus = "idle";
    const { rerender } = renderHook(() => useWorkspaceBootstrap("test-ws"));
    expect(mockBootstrap).toHaveBeenCalledTimes(1);

    mockSocketStatus = "connected";
    rerender();

    // Should NOT have re-bootstrapped — this is the initial connection
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });

  test("does NOT re-bootstrap on connecting → connected", () => {
    mockSocketStatus = "connecting";
    const { rerender } = renderHook(() => useWorkspaceBootstrap("test-ws"));
    expect(mockBootstrap).toHaveBeenCalledTimes(1);

    mockSocketStatus = "connected";
    rerender();

    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });
});
