/**
 * Set Stack Auth session cookies from device flow tokens.
 * Cookie format matches what the Stack Auth SDK expects
 * (see @stackframe/js client-app-impl.js).
 */

import { env } from "../env";

const projectId = env.VITE_STACK_PROJECT_ID;

export function setStackAuthCookies(
  refreshToken: string,
  accessToken: string,
): void {
  const refreshCookieName = `stack-refresh-${projectId}--default`;
  const refreshValue = JSON.stringify({
    refresh_token: refreshToken,
    updated_at_millis: Date.now(),
  });

  const accessCookieName = "stack-access";
  const accessValue = JSON.stringify([refreshToken, accessToken]);

  // Refresh token: long-lived (1 year)
  document.cookie = `${refreshCookieName}=${encodeURIComponent(refreshValue)}; path=/; max-age=31536000; SameSite=Lax`;

  // Access token: short-lived (1 day, SDK refreshes automatically after pickup)
  document.cookie = `${accessCookieName}=${encodeURIComponent(accessValue)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearStackAuthCookies(): void {
  const refreshCookieName = `stack-refresh-${projectId}--default`;
  document.cookie = `${refreshCookieName}=; path=/; max-age=0`;
  document.cookie = `stack-access=; path=/; max-age=0`;
}
