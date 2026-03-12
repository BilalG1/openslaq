/**
 * Validates that a webhook URL is safe to fetch server-side.
 * Blocks private/internal IPs, localhost, and link-local addresses.
 * In test mode (E2E_TEST_SECRET set), localhost/127.x URLs are allowed.
 */

const isTestMode = !!process.env.E2E_TEST_SECRET && process.env.NODE_ENV !== "production";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.",
  "[::1]",
  "metadata.google.internal",
  "metadata.google.internal.",
]);

/** IPv4 ranges that should never be fetched from the server */
export function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;

  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

export function validateWebhookUrl(url: string): { ok: true } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs are allowed" };
  }

  // In test mode, allow localhost/127.x for local bot webhook servers
  if (isTestMode) {
    return { ok: true };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "URL points to a blocked host" };
  }

  if (isBlockedIPv4(hostname)) {
    return { ok: false, reason: "URL points to a private/internal IP address" };
  }

  // Block IPv6 loopback and link-local
  if (hostname.startsWith("[")) {
    const inner = hostname.slice(1, -1);
    if (inner === "::1" || inner.startsWith("fe80:") || inner.startsWith("fc") || inner.startsWith("fd")) {
      return { ok: false, reason: "URL points to a private/internal IP address" };
    }
  }

  return { ok: true };
}
