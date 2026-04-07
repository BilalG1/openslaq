/**
 * Stack Auth device flow for desktop sign-in.
 * Opens the web app in the system browser for authentication,
 * then polls for the resulting refresh token.
 *
 * Mirrors the CLI implementation in apps/cli/src/auth/device-flow.ts.
 */

import { env } from "../env";

const STACK_AUTH_BASE = "https://api.stack-auth.com/api/v1";

function stackHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-stack-project-id": env.VITE_STACK_PROJECT_ID,
    "x-stack-access-type": "client",
    "x-stack-publishable-client-key": env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  };
}

export interface DeviceFlowResult {
  pollingCode: string;
  loginCode: string;
}

export async function initiateDeviceFlow(): Promise<DeviceFlowResult> {
  const res = await fetch(`${STACK_AUTH_BASE}/auth/cli`, {
    method: "POST",
    headers: stackHeaders(),
    body: JSON.stringify({ expires_in_millis: 600_000 }),
  });
  if (!res.ok) {
    throw new Error(`Failed to initiate device flow: ${res.status}`);
  }
  const body = (await res.json()) as {
    polling_code: string;
    login_code: string;
  };
  return { pollingCode: body.polling_code, loginCode: body.login_code };
}

export async function pollForToken(
  pollingCode: string,
  signal?: AbortSignal,
): Promise<string> {
  const maxAttempts = 300; // 10 minutes at 2s intervals
  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) throw new Error("Polling cancelled");
    const res = await fetch(`${STACK_AUTH_BASE}/auth/cli/poll`, {
      method: "POST",
      headers: stackHeaders(),
      body: JSON.stringify({ polling_code: pollingCode }),
      signal,
    });
    if (res.ok) {
      const body = (await res.json()) as {
        refresh_token?: string;
        status: string;
      };
      if (body.refresh_token) {
        return body.refresh_token;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Device flow timed out after 10 minutes");
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const res = await fetch(
    `${STACK_AUTH_BASE}/auth/sessions/current/refresh`,
    {
      method: "POST",
      headers: {
        ...stackHeaders(),
        "x-stack-refresh-token": refreshToken,
      },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${res.status}`);
  }
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}
