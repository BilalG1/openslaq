import type { AuthProvider } from "@openslaq/client-core";
import { AuthError } from "@openslaq/client-core";
import {
  getServerSession,
  setServerSession,
  clearServerSession,
} from "./server-store";
import type { AuthStrategy } from "./auth-strategies";
import { router } from "expo-router";

export interface MobileAuthHandle {
  provider: AuthProvider;
  setToken: (token: string | null) => void;
}

export function createMobileAuthProvider(
  serverId: string,
  strategy: AuthStrategy,
  onAuthRequired?: () => void,
): MobileAuthHandle {
  let cachedToken: string | null = null;
  let authInvalidated = false;
  let refreshInFlight: Promise<string | null> | null = null;

  function setToken(token: string | null) {
    cachedToken = token;
    refreshInFlight = null;
    if (token) authInvalidated = false;
  }

  async function getValidToken(): Promise<string | null> {
    if (authInvalidated) return null;
    if (cachedToken) return cachedToken;

    // Deduplicate concurrent refresh calls
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = doRefresh();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function doRefresh(): Promise<string | null> {
    const session = await getServerSession(serverId);
    if (!session) return null;

    try {
      const refreshed = await strategy.refreshAccessToken(session.refreshToken);
      const newToken = refreshed.access_token;
      await setServerSession(serverId, {
        accessToken: newToken,
        refreshToken: refreshed.refresh_token,
        userId: refreshed.user_id,
      });
      cachedToken = newToken;
      return newToken;
    } catch {
      return null;
    }
  }

  const provider: AuthProvider = {
    getAccessToken: () => getValidToken(),
    requireAccessToken: async () => {
      const token = await getValidToken();
      if (!token) throw new AuthError("No valid token available");
      return token;
    },
    refreshAccessToken: async () => {
      cachedToken = null;
      return doRefresh();
    },
    onAuthRequired: () => {
      cachedToken = null;
      authInvalidated = true;
      void clearServerSession(serverId);
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        router.replace("/(auth)/sign-in");
      }
    },
  };

  return { provider, setToken };
}
