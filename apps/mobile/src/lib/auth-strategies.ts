import type { AuthTokens } from "./stack-auth";

export interface AuthStrategy {
  refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
}

export interface StackAuthConfig {
  projectId: string;
  publishableKey: string;
}

export function createStackAuthStrategy(config: StackAuthConfig): AuthStrategy {
  const STACK_API_BASE = "https://api.stack-auth.com/api/v1";

  function stackHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Stack-Project-Id": config.projectId,
      "X-Stack-Access-Type": "client",
      "X-Stack-Publishable-Client-Key": config.publishableKey,
    };
  }

  return {
    async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
      const res = await fetch(`${STACK_API_BASE}/auth/sessions/current/refresh`, {
        method: "POST",
        headers: {
          "X-Stack-Project-Id": config.projectId,
          "X-Stack-Access-Type": "client",
          "X-Stack-Publishable-Client-Key": config.publishableKey,
          "X-Stack-Refresh-Token": refreshToken,
        },
      });
      if (!res.ok) {
        throw new Error(`Token refresh failed (${res.status})`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const accessToken = json.access_token;
      if (typeof accessToken !== "string") {
        throw new Error("Invalid token response: missing access_token");
      }
      // Stack Auth doesn't rotate refresh tokens — reuse the original
      const newRefreshToken = typeof json.refresh_token === "string"
        ? json.refresh_token
        : refreshToken;
      // Extract user_id from JWT sub claim
      const { decodeJwt } = await import("jose");
      const { sub } = decodeJwt(accessToken);
      const userId = typeof json.user_id === "string" ? json.user_id : (sub ?? "");
      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        user_id: userId,
      };
    },
  };
}

export function createBuiltinAuthStrategy(serverUrl: string): AuthStrategy {
  return {
    async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
      const res = await fetch(`${serverUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        throw new Error(`Token refresh failed (${res.status})`);
      }
      const json = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        userId: string;
      };
      return {
        access_token: json.accessToken,
        refresh_token: json.refreshToken,
        user_id: json.userId,
      };
    },
  };
}
