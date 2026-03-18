import { env } from "../../env";

const SENTRY_API_URL = "https://sentry.io/api/0";

export async function getProjectBySlug(
  accessToken: string,
  orgSlug: string,
  projectSlug: string,
): Promise<{ id: string; slug: string; name: string } | null> {
  const res = await fetch(`${SENTRY_API_URL}/projects/${orgSlug}/${projectSlug}/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { id: string; slug: string; name: string };
  return data;
}

export async function listProjects(
  accessToken: string,
  orgSlug: string,
): Promise<Array<{ id: string; slug: string; name: string }>> {
  const res = await fetch(`${SENTRY_API_URL}/organizations/${orgSlug}/projects/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Sentry API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as Array<{ id: string; slug: string; name: string }>;
}

export async function refreshAccessToken(
  installationId: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const res = await fetch(
    `${SENTRY_API_URL}/sentry-app-installations/${installationId}/authorizations/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: env.SENTRY_CLIENT_ID,
        client_secret: env.SENTRY_CLIENT_SECRET,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to refresh Sentry token: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    token: string;
    refreshToken: string;
    expiresAt: string;
  };

  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    expiresAt: new Date(data.expiresAt),
  };
}

export function isSentryConfigured(): boolean {
  return !!(env.SENTRY_CLIENT_ID && env.SENTRY_CLIENT_SECRET && env.SENTRY_APP_SLUG);
}
