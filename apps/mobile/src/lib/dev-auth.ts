import { env } from "./env";
import { setServerSession, serverIdFromUrl } from "./server-store";

export interface DevSignInResult {
  userId: string;
  accessToken: string;
}

export async function performDevQuickSignIn(): Promise<DevSignInResult> {
  const secret = env.EXPO_PUBLIC_E2E_TEST_SECRET;
  if (!secret) throw new Error("EXPO_PUBLIC_E2E_TEST_SECRET is not set");

  const apiUrl = env.EXPO_PUBLIC_API_URL;
  const res = await fetch(`${apiUrl}/api/auth/dev-sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });

  if (!res.ok) {
    throw new Error(`Dev sign-in failed: ${res.status}`);
  }

  const { userId, accessToken } = (await res.json()) as DevSignInResult;

  const serverId = serverIdFromUrl(apiUrl);
  await setServerSession(serverId, {
    accessToken,
    refreshToken: `dev-refresh-${userId}`,
    userId,
  });
  return { userId, accessToken };
}
