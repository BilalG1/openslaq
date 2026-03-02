import { renderHook, act, waitFor } from "@testing-library/react-native";
import { getCurrentUser } from "@openslaq/client-core";
import { useCurrentUserProfile } from "../useCurrentUserProfile";

jest.mock("@openslaq/client-core", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { onAuthRequired: jest.fn() },
  }),
}));

jest.mock("@/lib/api", () => ({
  api: { __api: "mock" },
}));

const getCurrentUserMock = getCurrentUser as jest.Mock;

describe("useCurrentUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns loading=true initially, then profile after fetch resolves", async () => {
    const profile = { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null };
    getCurrentUserMock.mockResolvedValue(profile);

    const { result } = renderHook(() => useCurrentUserProfile());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(profile);
  });

  it("handles getCurrentUser error gracefully", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCurrentUserProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
  });

  it("refresh() re-fetches the profile", async () => {
    const profile1 = { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null };
    const profile2 = { id: "u-1", displayName: "Alice Updated", email: "alice@test.com", avatarUrl: null };
    // Use mockResolvedValue (not Once) so strict-mode double-effect still returns profile1
    getCurrentUserMock.mockResolvedValue(profile1);

    const { result } = renderHook(() => useCurrentUserProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(profile1);

    // Now switch mock for refresh
    getCurrentUserMock.mockResolvedValue(profile2);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.profile).toEqual(profile2);
    expect(getCurrentUserMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
