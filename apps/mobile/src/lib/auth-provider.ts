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
  destroy: () => void;
}

/** Refresh buffer: refresh 5 minutes before actual expiry */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Decode the `exp` claim from a JWT without verifying the signature.
 * Returns the expiration time in milliseconds, or null if missing.
 */
function getTokenExpiryMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof payload.exp === "number") return payload.exp * 1000;
    return null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, bufferMs = REFRESH_BUFFER_MS): boolean {
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs == null) return false; // no exp claim — treat as valid
  return Date.now() + bufferMs >= expiryMs;
}

export function createMobileAuthProvider(
  serverId: string,
  strategy: AuthStrategy,
  onAuthRequired?: () => void,
): MobileAuthHandle {
  let cachedToken: string | null = null;
  let authInvalidated = false;
  let refreshInFlight: Promise<string | null> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function clearRefreshTimer() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleProactiveRefresh(token: string) {
    clearRefreshTimer();
    const expiryMs = getTokenExpiryMs(token);
    if (expiryMs == null) return;
    const delay = expiryMs - Date.now() - REFRESH_BUFFER_MS;
    if (delay <= 0) return; // already within buffer — will refresh on next access
    refreshTimer = setTimeout(() => {
      void deduplicatedRefresh();
    }, delay);
  }

  function setToken(token: string | null) {
    cachedToken = token;
    refreshInFlight = null;
    clearRefreshTimer();
    if (token) {
      authInvalidated = false;
      scheduleProactiveRefresh(token);
    }
  }

  function destroy() {
    clearRefreshTimer();
  }

  async function deduplicatedRefresh(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = doRefresh();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function getValidToken(): Promise<string | null> {
    if (authInvalidated) return null;

    // If cached token exists and is not expired/near-expiry, use it
    if (cachedToken && !isTokenExpired(cachedToken)) return cachedToken;

    // Token is missing or expired — refresh with deduplication
    cachedToken = null;
    return deduplicatedRefresh();
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
      scheduleProactiveRefresh(newToken);
      return newToken;
    } catch {
      // Refresh failed — session is unrecoverable, force sign-out
      provider.onAuthRequired();
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
      return deduplicatedRefresh();
    },
    onAuthRequired: () => {
      cachedToken = null;
      authInvalidated = true;
      clearRefreshTimer();
      void clearServerSession(serverId);
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        router.replace("/(auth)/sign-in");
      }
    },
  };

  return { provider, setToken, destroy };
}
