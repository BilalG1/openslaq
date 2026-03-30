import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { loadTokens, saveTokens } from "./auth/token-store";
import { refreshAccessToken } from "./auth/device-flow";
import { API_URL } from "./config";

export type CliClient = ReturnType<typeof hc<AppType>>;

export async function getAuthToken(): Promise<string> {
  // 1. Environment variable (highest priority, for CI)
  const envKey = process.env.OPENSLAQ_API_KEY;
  if (envKey) return envKey;

  const tokens = await loadTokens();
  if (!tokens) {
    console.error("Not logged in. Run `openslaq login` first.");
    process.exit(1);
  }

  // 2. API key from stored tokens file (from `login --api-key`)
  if (tokens.apiKey) return tokens.apiKey;

  // 3. JWT access/refresh token flow (existing behavior)
  try {
    const newAccessToken = await refreshAccessToken(tokens.refreshToken);
    await saveTokens({ refreshToken: tokens.refreshToken, accessToken: newAccessToken });
    return newAccessToken;
  } catch {
    return tokens.accessToken;
  }
}

export async function getAuthenticatedClient(
  apiUrl = API_URL,
): Promise<CliClient> {
  const token = await getAuthToken();
  return hc<AppType>(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function requireWorkspace(slug: string | undefined): string {
  if (!slug) {
    console.error("Missing --workspace flag. Run `openslaq workspaces list` to see available workspace slugs.");
    process.exit(1);
  }
  return slug;
}

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAuthToken();
  const url = `${API_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
