import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import type { AuthProvider } from "@openslaq/client-core";
import {
  sendOtpCode,
  verifyOtpCode,
  signInWithAppleNative,
  getOAuthAuthorizeUrl,
  exchangeOAuthCode,
} from "../lib/stack-auth";
import { env } from "../lib/env";
import { getTokens, storeTokens, clearTokens } from "../lib/token-store";
import { createMobileAuthProvider, setAuthToken } from "../lib/auth-provider";

WebBrowser.maybeCompleteAuthSession();

interface AuthUser {
  id: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  authProvider: AuthProvider;
  sendOtp: (email: string) => Promise<string>;
  verifyOtp: (code: string, nonce: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithOAuth: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const authProvider = useMemo(
    () =>
      createMobileAuthProvider(() => {
        setUser(null);
        setAuthToken(null);
      }),
    [],
  );

  // Restore session on mount (with Detox override for E2E testing)
  useEffect(() => {
    void (async () => {
      if (__DEV__) {
        try {
          const { NativeModules, Settings } = require("react-native");
          const devArgs = NativeModules.DevSettings?.launchArgs;
          const testToken =
            devArgs?.detoxTestToken ?? Settings.get("detoxTestToken");
          const testUserId =
            devArgs?.detoxTestUserId ?? Settings.get("detoxTestUserId");
          if (testToken && testUserId) {
            setAuthToken(testToken);
            setUser({ id: testUserId });
            setIsLoading(false);
            return;
          }
        } catch {
          // SettingsManager TurboModule not available (e.g. Jest environment)
        }
      }

      const tokens = await getTokens();
      if (tokens) {
        setAuthToken(tokens.accessToken);
        setUser({ id: tokens.userId });
      }
      setIsLoading(false);
    })();
  }, []);

  const handleTokens = useCallback(
    async (tokens: { access_token: string; refresh_token: string; user_id: string }) => {
      await storeTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        userId: tokens.user_id,
      });
      setAuthToken(tokens.access_token);
      setUser({ id: tokens.user_id });
    },
    [],
  );

  const sendOtp = useCallback(async (email: string): Promise<string> => {
    // Use the web URL as callback — Stack Auth validates it against trusted domains.
    // Mobile users enter the OTP code manually, so the magic link URL doesn't matter.
    const { nonce } = await sendOtpCode(email, `${env.EXPO_PUBLIC_WEB_URL}/auth/otp-callback`);
    return nonce;
  }, []);

  const verifyOtp = useCallback(
    async (code: string, nonce: string) => {
      const tokens = await verifyOtpCode(code, nonce);
      await handleTokens(tokens);
    },
    [handleTokens],
  );

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign In is only available on iOS");
    }
    const AppleAuthentication = require("expo-apple-authentication") as typeof import("expo-apple-authentication");
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    if (!credential.identityToken) {
      throw new Error("No identity token received from Apple");
    }
    const tokens = await signInWithAppleNative(credential.identityToken);
    await handleTokens(tokens);
  }, [handleTokens]);

  const signInWithOAuth = useCallback(
    async (provider: string) => {
      // Use the API's HTTPS callback as the redirect URI so it passes Stack Auth's
      // trusted-domain validation. The API endpoint then redirects to our custom scheme.
      const serverRedirectUri = `${env.EXPO_PUBLIC_API_URL}/api/auth/mobile-oauth-callback`;
      const appRedirectUri = AuthSession.makeRedirectUri({ scheme: "openslaq" });
      const codeVerifier = Crypto.randomUUID() + Crypto.randomUUID();
      const state = Crypto.randomUUID();
      const codeChallengeBase64 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 },
      );
      const codeChallenge = toBase64Url(codeChallengeBase64);

      // Encode appRedirectUri in state so the API server knows where to redirect back.
      // Stack Auth passes state through untouched.
      const statePayload = JSON.stringify({ nonce: state, redirect: appRedirectUri });
      const encodedState = btoa(statePayload);
      const authorizeUrl = getOAuthAuthorizeUrl(
        provider,
        serverRedirectUri,
        codeChallenge,
        encodedState,
      );
      // WebBrowser listens for the app's actual scheme deep link (the final redirect)
      const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, appRedirectUri);

      if (result.type !== "success") return;

      const url = new URL(result.url);
      const oauthError = url.searchParams.get("error");
      if (oauthError) {
        throw new Error(
          url.searchParams.get("error_description") ??
            `OAuth failed: ${oauthError}`,
        );
      }

      const returnedState = url.searchParams.get("state");
      if (!returnedState) throw new Error("Invalid OAuth state");
      let stateNonce: string | undefined;
      try {
        stateNonce = JSON.parse(atob(returnedState)).nonce;
      } catch {
        // malformed state
      }
      if (stateNonce !== state) throw new Error("Invalid OAuth state");

      const code = url.searchParams.get("code");
      if (!code) throw new Error("No authorization code received");

      // redirect_uri must match what was sent to the authorize endpoint
      const tokens = await exchangeOAuthCode(code, serverRedirectUri, codeVerifier);
      await handleTokens(tokens);
    },
    [handleTokens],
  );

  const signOut = useCallback(async () => {
    await clearTokens();
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      authProvider,
      sendOtp,
      verifyOtp,
      signInWithApple,
      signInWithOAuth,
      signOut,
    }),
    [isLoading, user, authProvider, sendOtp, verifyOtp, signInWithApple, signInWithOAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthContextProvider");
  return ctx;
}
