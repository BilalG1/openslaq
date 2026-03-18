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

jest.mock("../../lib/token-store", () => ({
  getTokens: jest.fn(() => Promise.resolve(null)),
  storeTokens: jest.fn(() => Promise.resolve()),
  clearTokens: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../lib/auth-provider", () => ({
  createMobileAuthProvider: jest.fn(() => ({
    getAccessToken: jest.fn(() => Promise.resolve(null)),
    requireAccessToken: jest.fn(() => Promise.reject(new Error("No token"))),
    onAuthRequired: jest.fn(),
  })),
  setAuthToken: jest.fn(),
}));

jest.mock("../../lib/dev-auth", () => ({
  performDevQuickSignIn: jest.fn(),
}));

const { getTokens, storeTokens, clearTokens } =
  require("../../lib/token-store") as {
    getTokens: jest.Mock;
    storeTokens: jest.Mock;
    clearTokens: jest.Mock;
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
const { env } = require("../../lib/env") as {
  env: { EXPO_PUBLIC_API_URL: string };
};

const { openAuthSessionAsync } = require("expo-web-browser") as {
  openAuthSessionAsync: jest.Mock;
};

const { signInAsync: appleSignInAsync } = require("expo-apple-authentication") as {
  signInAsync: jest.Mock;
};

const { setAuthToken } = require("../../lib/auth-provider") as {
  setAuthToken: jest.Mock;
};

const { performDevQuickSignIn } = require("../../lib/dev-auth") as {
  performDevQuickSignIn: jest.Mock;
};

function TestConsumer() {
  const { isLoading, isAuthenticated, user, sendOtp, verifyOtp, signInWithApple, signOut, signInWithOAuth, devQuickSignIn } =
    useAuth();

  const handleSendOtp = async () => {
    const nonce = await sendOtp("test@test.com");
    // Store nonce in testID for verification
    (globalThis as Record<string, unknown>).__testNonce = nonce;
  };

  return (
    <>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="authenticated">{String(isAuthenticated)}</Text>
      <Text testID="user-id">{user?.id ?? "none"}</Text>
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
    getTokens.mockResolvedValue(null);
    getOAuthAuthorizeUrl.mockReturnValue(
      "https://api.stack-auth.com/api/v1/auth/oauth/authorize/google",
    );
    openAuthSessionAsync.mockResolvedValue({ type: "cancel" });
  });

  it("initially loading, resolves unauthenticated when no tokens", async () => {
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

  it("restores session from stored tokens", async () => {
    getTokens.mockResolvedValue({
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

  it("sendOtp calls sendOtpCode and returns nonce", async () => {
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

    expect(sendOtpCode).toHaveBeenCalledWith(
      "test@test.com",
      "http://localhost:3000/auth/otp-callback",
    );
    expect((globalThis as Record<string, unknown>).__testNonce).toBe("nonce-abc");
  });

  it("verifyOtp stores tokens and sets user", async () => {
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

    expect(verifyOtpCode).toHaveBeenCalledWith("123456", "test-nonce");
    expect(storeTokens).toHaveBeenCalledWith({
      accessToken: "otp-token",
      refreshToken: "otp-refresh",
      userId: "otp-user",
    });
    expect(getTestIdText("authenticated")).toBe("true");
    expect(getTestIdText("user-id")).toBe("otp-user");
  });

  it("signOut clears tokens", async () => {
    getTokens.mockResolvedValue({
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

    expect(clearTokens).toHaveBeenCalled();
    expect(getTestIdText("authenticated")).toBe("false");
    expect(getTestIdText("user-id")).toBe("none");
  });

  it("signInWithOAuth exchanges code and stores tokens for valid callback state", async () => {
    const serverRedirectUri = `${env.EXPO_PUBLIC_API_URL}/api/auth/mobile-oauth-callback`;
    // State is now base64-encoded JSON: { nonce, redirect }
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
        "oauth-code",
        serverRedirectUri,
        "00000000-0000-0000-0000-00000000000000000000-0000-0000-0000-000000000000",
      );
    });
    expect(getOAuthAuthorizeUrl).toHaveBeenCalledWith(
      "google",
      serverRedirectUri,
      "mock-digest",
      expectedEncodedState,
    );
    expect(storeTokens).toHaveBeenCalledWith({
      accessToken: "oauth-token",
      refreshToken: "oauth-refresh",
      userId: "oauth-user",
    });
  });

  it("signInWithOAuth rejects callback with mismatched state", async () => {
    openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "openslaq://redirect?code=oauth-code&state=wrong-state",
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
      expect(openAuthSessionAsync).toHaveBeenCalled();
    });
    expect(exchangeOAuthCode).not.toHaveBeenCalled();
    expect(storeTokens).not.toHaveBeenCalled();
  });

  it("signInWithApple calls native Apple auth and stores tokens", async () => {
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
    expect(signInWithAppleNative).toHaveBeenCalledWith("apple-id-token");
    expect(storeTokens).toHaveBeenCalledWith({
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
});
