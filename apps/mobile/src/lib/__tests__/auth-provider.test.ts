import { AuthError } from "@openslaq/client-core";

jest.mock("../server-store", () => ({
  getServerSession: jest.fn(),
  setServerSession: jest.fn().mockResolvedValue(undefined),
  clearServerSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

import { router } from "expo-router";
import { getServerSession, setServerSession, clearServerSession } from "../server-store";
import { createMobileAuthProvider } from "../auth-provider";
import type { AuthStrategy } from "../auth-strategies";

const getSessionMock = getServerSession as jest.Mock;
const setSessionMock = setServerSession as jest.Mock;
const clearSessionMock = clearServerSession as jest.Mock;
const replaceMock = (router as unknown as { replace: jest.Mock }).replace;

const TEST_SERVER_ID = "srv_test";

function mockStrategy(result?: { access_token: string; refresh_token: string; user_id: string }): AuthStrategy {
  return {
    refreshAccessToken: jest.fn().mockResolvedValue(
      result ?? { access_token: "new-access", refresh_token: "new-refresh", user_id: "user-1" },
    ),
  };
}

function failingStrategy(): AuthStrategy {
  return {
    refreshAccessToken: jest.fn().mockRejectedValue(new Error("refresh failed")),
  };
}

describe("auth-provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a cached token without reading storage", async () => {
    const strategy = mockStrategy();
    const { provider, setToken } = createMobileAuthProvider(TEST_SERVER_ID, strategy);
    setToken("cached-token");

    await expect(provider.getAccessToken()).resolves.toBe("cached-token");
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("returns null when no session is stored", async () => {
    getSessionMock.mockResolvedValue(null);
    const strategy = mockStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    await expect(provider.getAccessToken()).resolves.toBeNull();
  });

  it("refreshes and stores tokens from refresh token", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    const strategy = mockStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    await expect(provider.getAccessToken()).resolves.toBe("new-access");
    await expect(provider.getAccessToken()).resolves.toBe("new-access");

    expect(strategy.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(strategy.refreshAccessToken).toHaveBeenCalledWith("refresh-1");
    expect(setSessionMock).toHaveBeenCalledWith(TEST_SERVER_ID, {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      userId: "user-1",
    });
  });

  it("returns null when refresh fails", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    const strategy = failingStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    await expect(provider.getAccessToken()).resolves.toBeNull();
  });

  it("throws when requireAccessToken has no valid token", async () => {
    getSessionMock.mockResolvedValue(null);
    const strategy = mockStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    await expect(provider.requireAccessToken()).rejects.toBeInstanceOf(AuthError);
    await expect(provider.requireAccessToken()).rejects.toThrow("No valid token available");
  });

  it("runs custom onAuthRequired callback and clears cached token", async () => {
    const onAuthRequired = jest.fn();
    const strategy = mockStrategy();
    const { provider, setToken } = createMobileAuthProvider(TEST_SERVER_ID, strategy, onAuthRequired);
    setToken("cached-token");

    provider.onAuthRequired();
    await expect(provider.getAccessToken()).resolves.toBeNull();

    expect(onAuthRequired).toHaveBeenCalledTimes(1);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when no onAuthRequired callback is passed", () => {
    const strategy = mockStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    provider.onAuthRequired();

    expect(replaceMock).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it("deduplicates concurrent getAccessToken calls into a single refresh", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    const strategy = mockStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    const [token1, token2] = await Promise.all([
      provider.getAccessToken(),
      provider.getAccessToken(),
    ]);

    expect(token1).toBe("new-access");
    expect(token2).toBe("new-access");
    expect(strategy.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("clears persisted session on onAuthRequired", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "stale-access",
      refreshToken: "stale-refresh",
      userId: "user-1",
    });

    const onAuthRequired = jest.fn();
    const strategy = mockStrategy();
    const { provider } = createMobileAuthProvider(TEST_SERVER_ID, strategy, onAuthRequired);

    provider.onAuthRequired();

    const token = await provider.getAccessToken();
    expect(token).toBeNull();
    expect(clearSessionMock).toHaveBeenCalledWith(TEST_SERVER_ID);
  });

  it("refreshAccessToken clears cached token and refreshes from storage", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    const strategy = mockStrategy();
    const { provider, setToken } = createMobileAuthProvider(TEST_SERVER_ID, strategy);
    setToken("stale-cached-token");

    const refreshed = await provider.refreshAccessToken!();
    expect(refreshed).toBe("new-access");
    expect(strategy.refreshAccessToken).toHaveBeenCalledWith("refresh-1");

    // Subsequent calls should use the new cached token
    await expect(provider.getAccessToken()).resolves.toBe("new-access");
    expect(strategy.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("refreshAccessToken returns null when refresh fails", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    const strategy = failingStrategy();
    const { provider, setToken } = createMobileAuthProvider(TEST_SERVER_ID, strategy);
    setToken("stale-cached-token");

    const refreshed = await provider.refreshAccessToken!();
    expect(refreshed).toBeNull();
  });

  it("refreshes when cached token is expired", async () => {
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    const strategy = mockStrategy();
    const { provider, setToken } = createMobileAuthProvider(TEST_SERVER_ID, strategy);

    // Create a JWT-shaped token that expires in the past (exp = now - 60s)
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const expiredToken = `header.${expiredPayload}.signature`;
    setToken(expiredToken);

    // getAccessToken should detect the expired token and refresh
    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");
    expect(strategy.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent refreshAccessToken calls", async () => {
    let resolveRefresh: ((value: { access_token: string; refresh_token: string; user_id: string }) => void) | null = null;
    const strategy: AuthStrategy = {
      refreshAccessToken: jest.fn().mockImplementation(() =>
        new Promise((resolve) => { resolveRefresh = resolve; }),
      ),
    };
    getSessionMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });

    const { provider, setToken } = createMobileAuthProvider(TEST_SERVER_ID, strategy);
    setToken("stale-token");

    // Fire two concurrent refreshAccessToken calls
    const p1 = provider.refreshAccessToken!();
    const p2 = provider.refreshAccessToken!();

    // Let getServerSession resolve so doRefresh calls strategy.refreshAccessToken
    await Promise.resolve();
    await Promise.resolve();
    expect(strategy.refreshAccessToken).toHaveBeenCalledTimes(1);

    // Resolve the single refresh
    resolveRefresh!({ access_token: "new-access", refresh_token: "new-refresh", user_id: "user-1" });

    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe("new-access");
    expect(t2).toBe("new-access");
  });

  it("isolates state between provider instances (server switch)", async () => {
    const strategyA = mockStrategy({ access_token: "token-A", refresh_token: "refresh-A", user_id: "user-A" });
    const strategyB = mockStrategy({ access_token: "token-B", refresh_token: "refresh-B", user_id: "user-B" });

    const handleA = createMobileAuthProvider("srv_A", strategyA);
    const handleB = createMobileAuthProvider("srv_B", strategyB);

    handleA.setToken("token-A");
    handleB.setToken("token-B");

    // Provider A's onAuthRequired should NOT affect provider B
    handleA.provider.onAuthRequired();

    await expect(handleA.provider.getAccessToken()).resolves.toBeNull();
    await expect(handleB.provider.getAccessToken()).resolves.toBe("token-B");
  });
});
