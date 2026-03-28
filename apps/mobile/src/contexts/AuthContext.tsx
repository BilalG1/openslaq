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
import type { StackAuthConfig } from "../lib/auth-strategies";
import {
  createStackAuthStrategy,
  createBuiltinAuthStrategy,
} from "../lib/auth-strategies";
import { env } from "../lib/env";
import {
  getServerSession,
  setServerSession,
  clearServerSession,
} from "../lib/server-store";
import { createMobileAuthProvider } from "../lib/auth-provider";
import { performDevQuickSignIn } from "../lib/dev-auth";
import { useServer } from "./ServerContext";

WebBrowser.maybeCompleteAuthSession();

interface AuthUser {
  id: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  authProvider: AuthProvider;
  // Stack Auth methods (only available when server uses stack-auth)
  sendOtp: (email: string) => Promise<string>;
  verifyOtp: (code: string, nonce: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithOAuth: (provider: string) => Promise<void>;
  // Builtin auth methods (only available when server uses builtin)
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  // Common
  devQuickSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const { activeServer, apiUrl } = useServer();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const serverId = activeServer.id;
  const authType = activeServer.authType;

  const stackAuthConfig: StackAuthConfig | null = useMemo(() => {
    if (authType !== "stack-auth") return null;
    return {
      projectId: activeServer.stackProjectId ?? "",
      publishableKey: activeServer.stackPublishableKey ?? "",
    };
  }, [authType, activeServer.stackProjectId, activeServer.stackPublishableKey]);

  const authStrategy = useMemo(() => {
    if (authType === "stack-auth" && stackAuthConfig) {
      return createStackAuthStrategy(stackAuthConfig);
    }
    return createBuiltinAuthStrategy(apiUrl);
  }, [authType, stackAuthConfig, apiUrl]);

  const authHandle = useMemo(
    () =>
      createMobileAuthProvider(serverId, authStrategy, () => {
        setUser(null);
        authHandle?.setToken(null);
      }),
    [serverId, authStrategy],
  );
  const authProvider = authHandle.provider;
  const setAuthToken = authHandle.setToken;

  // Restore session on mount or when server changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setUser(null);
    setAuthToken(null);

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
            if (cancelled) return;
            setAuthToken(testToken);
            setUser({ id: testUserId });
            setIsLoading(false);
            return;
          }
        } catch {
          // SettingsManager TurboModule not available (e.g. Jest environment)
        }
      }

      const session = await getServerSession(serverId);
      if (cancelled) return;
      if (session) {
        setAuthToken(session.accessToken);
        setUser({ id: session.userId });
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [serverId]);

  const handleTokens = useCallback(
    async (tokens: { access_token: string; refresh_token: string; user_id: string }) => {
      await setServerSession(serverId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        userId: tokens.user_id,
      });
      setAuthToken(tokens.access_token);
      setUser({ id: tokens.user_id });
    },
    [serverId],
  );

  // --- Stack Auth methods ---

  const sendOtp = useCallback(async (email: string): Promise<string> => {
    if (!stackAuthConfig) throw new Error("Stack Auth not configured for this server");
    const { nonce } = await sendOtpCode(stackAuthConfig, email, `${env.EXPO_PUBLIC_WEB_URL}/auth/otp-callback`);
    return nonce;
  }, [stackAuthConfig]);

  const verifyOtp = useCallback(
    async (code: string, nonce: string) => {
      if (!stackAuthConfig) throw new Error("Stack Auth not configured for this server");
      const tokens = await verifyOtpCode(stackAuthConfig, code, nonce);
      await handleTokens(tokens);
    },
    [stackAuthConfig, handleTokens],
  );

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign In is only available on iOS");
    }
    if (!stackAuthConfig) throw new Error("Stack Auth not configured for this server");
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
    const tokens = await signInWithAppleNative(stackAuthConfig, credential.identityToken);
    await handleTokens(tokens);
  }, [stackAuthConfig, handleTokens]);

  const signInWithOAuth = useCallback(
    async (provider: string) => {
      if (!stackAuthConfig) throw new Error("Stack Auth not configured for this server");
      const serverRedirectUri = `${apiUrl}/api/auth/mobile-oauth-callback`;
      const appRedirectUri = AuthSession.makeRedirectUri({ scheme: "openslaq" });
      const codeVerifier = Crypto.randomUUID() + Crypto.randomUUID();
      const state = Crypto.randomUUID();
      const codeChallengeBase64 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 },
      );
      const codeChallenge = toBase64Url(codeChallengeBase64);

      const statePayload = JSON.stringify({ nonce: state, redirect: appRedirectUri });
      const encodedState = btoa(statePayload);
      const authorizeUrl = getOAuthAuthorizeUrl(
        stackAuthConfig,
        provider,
        serverRedirectUri,
        codeChallenge,
        encodedState,
      );
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

      const tokens = await exchangeOAuthCode(stackAuthConfig, code, serverRedirectUri, codeVerifier);
      await handleTokens(tokens);
    },
    [stackAuthConfig, apiUrl, handleTokens],
  );

  // --- Builtin auth methods ---

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (authType !== "builtin") throw new Error("Builtin auth not available for this server");
      const res = await fetch(`${apiUrl}/api/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Sign-in failed (${res.status})`);
      }
      const json = (await res.json()) as { accessToken: string; refreshToken: string; userId: string };
      await handleTokens({
        access_token: json.accessToken,
        refresh_token: json.refreshToken,
        user_id: json.userId,
      });
    },
    [authType, apiUrl, handleTokens],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (authType !== "builtin") throw new Error("Builtin auth not available for this server");
      const res = await fetch(`${apiUrl}/api/auth/sign-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Sign-up failed (${res.status})`);
      }
      const json = (await res.json()) as { accessToken: string; refreshToken: string; userId: string };
      await handleTokens({
        access_token: json.accessToken,
        refresh_token: json.refreshToken,
        user_id: json.userId,
      });
    },
    [authType, apiUrl, handleTokens],
  );

  // --- Common ---

  const devQuickSignIn = useCallback(async () => {
    const result = await performDevQuickSignIn();
    setAuthToken(result.accessToken);
    setUser({ id: result.userId });
    setIsLoading(false);
  }, [setAuthToken]);

  const signOut = useCallback(async () => {
    await clearServerSession(serverId);
    setAuthToken(null);
    setUser(null);
  }, [serverId]);

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
      signInWithPassword,
      signUp,
      devQuickSignIn,
      signOut,
    }),
    [isLoading, user, authProvider, sendOtp, verifyOtp, signInWithApple, signInWithOAuth, signInWithPassword, signUp, devQuickSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthContextProvider");
  return ctx;
}
