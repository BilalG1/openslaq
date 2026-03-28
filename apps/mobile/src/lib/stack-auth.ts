import { decodeJwt } from "jose";
import type { StackAuthConfig } from "./auth-strategies";

const STACK_API_BASE = "https://api.stack-auth.com/api/v1";
const PUBLISHABLE_CLIENT_KEY_NOT_NECESSARY_SENTINEL = "__stack_public_client__";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

function stackHeaders(config: StackAuthConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Stack-Project-Id": config.projectId,
    "X-Stack-Access-Type": "client",
    "X-Stack-Publishable-Client-Key": config.publishableKey,
  };
}

function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  // Stack Auth returns { error: "...", code: "..." } or { message: "..." }
  if (typeof b.error === "string") return b.error;
  if (typeof b.message === "string") return b.message;
  return undefined;
}

function getOAuthClientSecret(config: StackAuthConfig): string {
  return config.publishableKey || PUBLISHABLE_CLIENT_KEY_NOT_NECESSARY_SENTINEL;
}

function extractUserId(
  accessToken: string,
  body: Record<string, unknown>,
): string {
  if (typeof body.user_id === "string" && body.user_id) return body.user_id;
  const { sub } = decodeJwt(accessToken);
  if (typeof sub !== "string" || !sub) {
    throw new Error("Cannot determine user ID from token response");
  }
  return sub;
}

// --- OTP ---

export async function sendOtpCode(
  config: StackAuthConfig,
  email: string,
  callbackUrl: string,
): Promise<{ nonce: string }> {
  const res = await fetch(`${STACK_API_BASE}/auth/otp/send-sign-in-code`, {
    method: "POST",
    headers: stackHeaders(config),
    body: JSON.stringify({ email, callback_url: callbackUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      extractErrorMessage(body) ?? `Failed to send OTP code (${res.status})`,
    );
  }
  return res.json() as Promise<{ nonce: string }>;
}

export async function verifyOtpCode(
  config: StackAuthConfig,
  code: string,
  nonce: string,
): Promise<AuthTokens> {
  const res = await fetch(`${STACK_API_BASE}/auth/otp/sign-in`, {
    method: "POST",
    headers: stackHeaders(config),
    body: JSON.stringify({ code: code + nonce }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      extractErrorMessage(body) ?? `OTP verification failed (${res.status})`,
    );
  }
  return res.json() as Promise<AuthTokens>;
}

// --- Apple Native Sign In ---

export async function signInWithAppleNative(
  config: StackAuthConfig,
  idToken: string,
): Promise<AuthTokens> {
  const res = await fetch(
    `${STACK_API_BASE}/auth/oauth/callback/apple/native`,
    {
      method: "POST",
      headers: stackHeaders(config),
      body: JSON.stringify({ id_token: idToken }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      extractErrorMessage(body) ?? `Apple sign-in failed (${res.status})`,
    );
  }
  return res.json() as Promise<AuthTokens>;
}

// --- Token Refresh ---

export async function refreshAccessToken(
  config: StackAuthConfig,
  refreshToken: string,
): Promise<AuthTokens> {
  const res = await fetch(`${STACK_API_BASE}/auth/sessions/current/refresh`, {
    method: "POST",
    headers: stackHeaders(config),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status})`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const accessToken = json.access_token;
  const newRefreshToken = json.refresh_token;
  if (typeof accessToken !== "string" || typeof newRefreshToken !== "string") {
    throw new Error("Invalid token response: missing access_token or refresh_token");
  }
  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    user_id: extractUserId(accessToken, json),
  };
}

// --- OAuth ---

export function getOAuthAuthorizeUrl(
  config: StackAuthConfig,
  provider: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
): string {
  const providerId = provider.toLowerCase();
  const params = new URLSearchParams({
    client_id: config.projectId,
    client_secret: getOAuthClientSecret(config),
    redirect_uri: redirectUri,
    scope: "legacy",
    state,
    grant_type: "authorization_code",
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    type: "authenticate",
  });
  return `${STACK_API_BASE}/auth/oauth/authorize/${providerId}?${params.toString()}`;
}

export async function exchangeOAuthCode(
  config: StackAuthConfig,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<AuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: config.projectId,
    client_secret: getOAuthClientSecret(config),
  });

  const res = await fetch(`${STACK_API_BASE}/auth/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Stack-Project-Id": config.projectId,
      "X-Stack-Access-Type": "client",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(
      extractErrorMessage(errBody) ?? `OAuth exchange failed (${res.status})`,
    );
  }
  const json = (await res.json()) as Record<string, unknown>;
  const accessToken = json.access_token;
  const refreshToken = json.refresh_token;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    throw new Error("Invalid token response: missing access_token or refresh_token");
  }
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: extractUserId(accessToken, json),
  };
}
