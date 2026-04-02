import React from "react";
import { Text, TouchableOpacity } from "react-native";
import {
  render,
  screen,
  act,
  waitFor,
  fireEvent,
} from "@testing-library/react-native";
import { AuthContextProvider, useAuth } from "../AuthContext";

// Mock the auth-related modules
jest.mock("../../lib/stack-auth", () => ({
  sendOtpCode: jest.fn(),
  verifyOtpCode: jest.fn(),
  signInWithAppleNative: jest.fn(),
  getOAuthAuthorizeUrl: jest.fn(),
  exchangeOAuthCode: jest.fn(),
}));

jest.mock("../../lib/server-store", () => ({
  getServerSession: jest.fn(() => Promise.resolve(null)),
  setServerSession: jest.fn(() => Promise.resolve()),
  clearServerSession: jest.fn(() => Promise.resolve()),
  serverIdFromUrl: jest.fn(() => "srv_test"),
}));

jest.mock("../../lib/auth-strategies", () => ({
  createStackAuthStrategy: jest.fn(() => ({
    refreshAccessToken: jest.fn(),
  })),
  createBuiltinAuthStrategy: jest.fn(() => ({
    refreshAccessToken: jest.fn(),
  })),
}));

const mockSetToken = jest.fn();
jest.mock("../../lib/auth-provider", () => ({
  createMobileAuthProvider: jest.fn(() => ({
    provider: {
      getAccessToken: jest.fn(() => Promise.resolve(null)),
      requireAccessToken: jest.fn(() => Promise.reject(new Error("No token"))),
      onAuthRequired: jest.fn(),
    },
    setToken: mockSetToken,
  })),
}));

jest.mock("../../lib/dev-auth", () => ({
  performDevQuickSignIn: jest.fn(),
}));

jest.mock("@openslaq/client-core", () => ({
  getCurrentUser: jest.fn(() => Promise.resolve(null)),
}));

const { getServerSession, setServerSession, clearServerSession } =
  require("../../lib/server-store") as {
    getServerSession: jest.Mock;
    setServerSession: jest.Mock;
    clearServerSession: jest.Mock;
  };

const { sendOtpCode, verifyOtpCode, signInWithAppleNative } =
  require("../../lib/stack-auth") as {
    sendOtpCode: jest.Mock;
    verifyOtpCode: jest.Mock;
    signInWithAppleNative: jest.Mock;
  };
const { getOAuthAuthorizeUrl, exchangeOAuthCode } = require("../../lib/stack-auth") as {
  getOAuthAuthorizeUrl: jest.Mock;
  exchangeOAuthCode: jest.Mock;
};

const { openAuthSessionAsync } = require("expo-web-browser") as {
  openAuthSessionAsync: jest.Mock;
};

const { signInAsync: appleSignInAsync } = require("expo-apple-authentication") as {
  signInAsync: jest.Mock;
};

const setAuthToken = mockSetToken;

const { performDevQuickSignIn } = require("../../lib/dev-auth") as {
  performDevQuickSignIn: jest.Mock;
};

const { getCurrentUser } = require("@openslaq/client-core") as {
  getCurrentUser: jest.Mock;
};

function TestConsumer() {
  const { isLoading, isAuthenticated, user, sendOtp, verifyOtp, signInWithApple, signOut, signInWithOAuth, devQuickSignIn } =
    useAuth();

  const handleSendOtp = async () => {
    const nonce = await sendOtp("test@test.com");
    (globalThis as Record<string, unknown>).__testNonce = nonce;
  };

  return (
    <>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="authenticated">{String(isAuthenticated)}</Text>
      <Text testID="user-id">{user?.id ?? "none"}</Text>
      <Text testID="display-name">{user?.displayName ?? "none"}</Text>
      <Text testID="avatar-url">{user?.avatarUrl ?? "none"}</Text>
      <TouchableOpacity
        testID="send-otp"
        onPress={() => handleSendOtp().catch(() => undefined)}
      />
      <TouchableOpacity
        testID="verify-otp"
        onPress={() =>
          verifyOtp("123456", "test-nonce").catch(() => undefined)
        }
      />
      <TouchableOpacity
        testID="sign-in-apple"
        onPress={() => signInWithApple().catch(() => undefined)}
      />
      <TouchableOpacity
        testID="sign-in-oauth"
        onPress={() => signInWithOAuth("google").catch(() => undefined)}
      />
      <TouchableOpacity
        testID="dev-sign-in"
        onPress={() => devQuickSignIn().catch(() => undefined)}
      />
      <TouchableOpacity testID="sign-out" onPress={() => signOut()} />
    </>
  );
}

function getTestIdText(testID: string): string {
  return (screen.getByTestId(testID).children as string[]).join("");
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue(null);
    getCurrentUser.mockResolvedValue(null);
    getOAuthAuthorizeUrl.mockReturnValue(
      "https://api.stack-auth.com/api/v1/auth/oauth/authorize/google",
    );
    openAuthSessionAsync.mockResolvedValue({ type: "cancel" });
  });

  it("initially loading, resolves unauthenticated when no session", async () => {
    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    expect(getTestIdText("loading")).toBe("true");

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });
    expect(getTestIdText("authenticated")).toBe("false");
    expect(getTestIdText("user-id")).toBe("none");
  });

  it("restores session from stored server session", async () => {
    getServerSession.mockResolvedValue({
      accessToken: "stored-token",
      refreshToken: "stored-refresh",
      userId: "user-123",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });
    expect(getTestIdText("authenticated")).toBe("true");
    expect(getTestIdText("user-id")).toBe("user-123");
    expect(setAuthToken).toHaveBeenCalledWith("stored-token");
  });

  it("sendOtp calls sendOtpCode with config and returns nonce", async () => {
    sendOtpCode.mockResolvedValue({ nonce: "nonce-abc" });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("send-otp"));
    });

    // sendOtpCode now takes config as first arg
    expect(sendOtpCode).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj_test" }),
      "test@test.com",
      "http://localhost:3000/auth/otp-callback",
    );
    expect((globalThis as Record<string, unknown>).__testNonce).toBe("nonce-abc");
  });

  it("verifyOtp stores session and sets user", async () => {
    verifyOtpCode.mockResolvedValue({
      access_token: "otp-token",
      refresh_token: "otp-refresh",
      user_id: "otp-user",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("verify-otp"));
    });

    expect(verifyOtpCode).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj_test" }),
      "123456",
      "test-nonce",
    );
    expect(setServerSession).toHaveBeenCalledWith("srv_test", {
      accessToken: "otp-token",
      refreshToken: "otp-refresh",
      userId: "otp-user",
    });
    expect(getTestIdText("authenticated")).toBe("true");
    expect(getTestIdText("user-id")).toBe("otp-user");
  });

  it("signOut clears server session", async () => {
    getServerSession.mockResolvedValue({
      accessToken: "token",
      refreshToken: "refresh",
      userId: "user-789",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("authenticated")).toBe("true");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sign-out"));
    });

    expect(clearServerSession).toHaveBeenCalledWith("srv_test");
    expect(getTestIdText("authenticated")).toBe("false");
    expect(getTestIdText("user-id")).toBe("none");
  });

  it("signInWithOAuth exchanges code and stores session for valid callback state", async () => {
    const expectedEncodedState = btoa(
      JSON.stringify({ nonce: "00000000-0000-0000-0000-000000000000", redirect: "openslaq://redirect" }),
    );
    openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `openslaq://redirect?code=oauth-code&state=${encodeURIComponent(expectedEncodedState)}`,
    });
    exchangeOAuthCode.mockResolvedValue({
      access_token: "oauth-token",
      refresh_token: "oauth-refresh",
      user_id: "oauth-user",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sign-in-oauth"));
    });

    await waitFor(() => {
      expect(exchangeOAuthCode).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj_test" }),
        "oauth-code",
        "http://localhost:3001/api/auth/mobile-oauth-callback",
        "00000000-0000-0000-0000-00000000000000000000-0000-0000-0000-000000000000",
      );
    });
    expect(setServerSession).toHaveBeenCalledWith("srv_test", {
      accessToken: "oauth-token",
      refreshToken: "oauth-refresh",
      userId: "oauth-user",
    });
  });

  it("signInWithApple calls native Apple auth and stores session", async () => {
    appleSignInAsync.mockResolvedValue({
      identityToken: "apple-id-token",
      fullName: null,
      email: null,
    });
    signInWithAppleNative.mockResolvedValue({
      access_token: "apple-at",
      refresh_token: "apple-rt",
      user_id: "apple-uid",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sign-in-apple"));
    });

    expect(appleSignInAsync).toHaveBeenCalled();
    expect(signInWithAppleNative).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj_test" }),
      "apple-id-token",
    );
    expect(setServerSession).toHaveBeenCalledWith("srv_test", {
      accessToken: "apple-at",
      refreshToken: "apple-rt",
      userId: "apple-uid",
    });
    expect(getTestIdText("authenticated")).toBe("true");
    expect(getTestIdText("user-id")).toBe("apple-uid");
  });

  it("devQuickSignIn calls performDevQuickSignIn and sets user", async () => {
    performDevQuickSignIn.mockResolvedValue({
      userId: "dev-user-123",
      accessToken: "dev-token",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("dev-sign-in"));
    });

    expect(performDevQuickSignIn).toHaveBeenCalled();
    expect(getTestIdText("authenticated")).toBe("true");
    expect(getTestIdText("user-id")).toBe("dev-user-123");
  });

  // ── Profile enrichment ─────────────────────────────────────

  it("populates displayName and avatarUrl after session restore", async () => {
    getServerSession.mockResolvedValue({
      accessToken: "stored-token",
      refreshToken: "stored-refresh",
      userId: "user-123",
    });
    getCurrentUser.mockResolvedValue({
      id: "user-123",
      displayName: "Alice Johnson",
      avatarUrl: "https://img.test/alice.png",
      email: "alice@test.com",
      statusEmoji: null,
      statusText: null,
      statusExpiresAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("display-name")).toBe("Alice Johnson");
    });
    expect(getTestIdText("avatar-url")).toBe("https://img.test/alice.png");
    expect(getTestIdText("user-id")).toBe("user-123");
  });

  it("handles profile fetch failure gracefully — user stays authenticated", async () => {
    getServerSession.mockResolvedValue({
      accessToken: "token",
      refreshToken: "refresh",
      userId: "user-456",
    });
    getCurrentUser.mockRejectedValue(new Error("Network error"));

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });
    expect(getTestIdText("authenticated")).toBe("true");
    expect(getTestIdText("user-id")).toBe("user-456");
    expect(getTestIdText("display-name")).toBe("none");
  });

  it("does not fetch profile when not authenticated", async () => {
    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await waitFor(() => {
      expect(getTestIdText("loading")).toBe("false");
    });
    expect(getTestIdText("authenticated")).toBe("false");
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});
