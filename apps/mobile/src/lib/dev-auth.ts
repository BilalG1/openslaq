import { env } from "./env";
import { storeTokens } from "./token-store";
import { setAuthToken } from "./auth-provider";

export interface DevSignInResult {
  userId: string;
  accessToken: string;
}

export async function performDevQuickSignIn(): Promise<DevSignInResult> {
  const secret = env.EXPO_PUBLIC_E2E_TEST_SECRET;
  if (!secret) throw new Error("EXPO_PUBLIC_E2E_TEST_SECRET is not set");

  const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/auth/dev-sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });

  if (!res.ok) {
    throw new Error(`Dev sign-in failed: ${res.status}`);
  }

  const { userId, accessToken } = (await res.json()) as DevSignInResult;

  await storeTokens({
    accessToken,
    refreshToken: `dev-refresh-${userId}`,
    userId,
  });
  setAuthToken(accessToken);

  return { userId, accessToken };
}
