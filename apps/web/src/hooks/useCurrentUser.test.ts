import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../test-utils";

// Stable mock for useMockUser — returns null (no gallery mode)
vi.mock("../gallery/gallery-context", () => ({
  useMockUser: () => null,
}));

// Stable mock for Stack Auth useUser — returns null (no real auth)
vi.mock("@stackframe/react", () => ({
  useUser: () => null,
}));

const fakeSession = {
  userId: "u-1",
  displayName: "Dev",
  email: "dev@test.local",
  accessToken: "tok-1",
};

let snapshotValue: typeof fakeSession | null = null;

vi.mock("../lib/dev-auth", () => ({
  subscribeDevSession: (_cb: () => void) => {
    return () => {};
  },
  getDevSessionSnapshot: () => snapshotValue,
  createDevUser: (session: typeof fakeSession) => ({
    id: session.userId,
    displayName: session.displayName,
    primaryEmail: session.email,
    profileImageUrl: null,
    getAuthJson: async () => ({ accessToken: session.accessToken }),
    update: async () => {},
  }),
}));

describe("useCurrentUser", () => {
  beforeEach(() => {
    snapshotValue = null;
  });

  test("returns stable object reference across re-renders for same dev session", async () => {
    snapshotValue = fakeSession;

    // Import after mocks are set up
    const { useCurrentUser } = await import("./useCurrentUser");

    const { result, rerender } = renderHook(() => useCurrentUser());
    const first = result.current;

    rerender();
    const second = result.current;

    rerender();
    const third = result.current;

    // The same session should produce the exact same object reference —
    // this is what prevents the infinite re-fetch loop.
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  test("returns null when no session is active", async () => {
    snapshotValue = null;

    const { useCurrentUser } = await import("./useCurrentUser");
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toBeNull();
  });
});
