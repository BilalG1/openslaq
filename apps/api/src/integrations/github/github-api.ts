import { env } from "../../env";

/**
 * Get an installation access token from GitHub.
 * Only works when GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are configured.
 */
export async function getInstallationToken(installationId: string): Promise<string | null> {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    return null;
  }

  const jwt = await createGithubJwt();
  if (!jwt) return null;

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    console.error(`[github] Failed to get installation token: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}

async function createGithubJwt(): Promise<string | null> {
  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) return null;

  // Import jose for JWT signing
  const { SignJWT, importPKCS8 } = await import("jose");

  const key = await importPKCS8(privateKey, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60) // 60 seconds in the past for clock drift
    .setExpirationTime(now + 600) // 10 minutes max
    .setIssuer(appId)
    .sign(key);

  return jwt;
}

export function isGithubConfigured(): boolean {
  return !!(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
}
