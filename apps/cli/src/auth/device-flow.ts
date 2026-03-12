import {
  STACK_AUTH_BASE,
  STACK_PROJECT_ID,
  STACK_PUBLISHABLE_KEY,
} from "../config";

type FetchFn = typeof globalThis.fetch;

function stackHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-stack-project-id": STACK_PROJECT_ID,
    "x-stack-access-type": "client",
    "x-stack-publishable-client-key": STACK_PUBLISHABLE_KEY,
  };
}

export interface DeviceFlowResult {
  pollingCode: string;
  loginCode: string;
}

export async function initiateDeviceFlow(
  fetchFn: FetchFn = globalThis.fetch,
): Promise<DeviceFlowResult> {
  const res = await fetchFn(`${STACK_AUTH_BASE}/api/v1/auth/cli`, {
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
  fetchFn: FetchFn = globalThis.fetch,
): Promise<string> {
  const maxAttempts = 300; // 10 minutes at 2s intervals
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetchFn(`${STACK_AUTH_BASE}/api/v1/auth/cli/poll`, {
      method: "POST",
      headers: stackHeaders(),
      body: JSON.stringify({ polling_code: pollingCode }),
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
  fetchFn: FetchFn = globalThis.fetch,
): Promise<string> {
  const res = await fetchFn(
    `${STACK_AUTH_BASE}/api/v1/auth/sessions/current/refresh`,
    {
      method: "POST",
      headers: {
        ...stackHeaders(),
        "x-stack-refresh-token": refreshToken,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${res.status}`);
  }
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}
