import { env } from "../env";

/**
 * Returns the public-facing web URL origin.
 * In the desktop app (Tauri), window.location.origin is a local address
 * (e.g. http://localhost:3334), so we use VITE_WEB_URL instead.
 */
export function getWebOrigin(): string {
  return env.VITE_WEB_URL ?? window.location.origin;
}
