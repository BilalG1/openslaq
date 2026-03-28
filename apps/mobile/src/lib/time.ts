/**
 * Format an ISO timestamp as a short locale time string (e.g. "3:45 PM").
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Format an ISO timestamp as a relative time string:
 * "now" (<1 min), "5m", "3h", "2d", or full locale date for 30d+.
 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d`;
  return new Date(iso).toLocaleDateString();
}
