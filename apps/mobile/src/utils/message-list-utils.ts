import type { Message } from "@openslaq/shared";

const GROUPING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Determines whether a day separator should be shown between two consecutive
 * messages. Returns true when there is no previous message or the previous
 * message was sent on a different calendar day.
 */
export function shouldShowDaySeparator(
  prev: Message | undefined,
  current: Message,
): boolean {
  if (!prev) return true;
  const prevDate = new Date(prev.createdAt);
  const curDate = new Date(current.createdAt);
  return curDate.toDateString() !== prevDate.toDateString();
}

/**
 * Determines whether a message should be visually grouped with the previous
 * message (same sender, within 5 minutes, no system messages in between,
 * and no day boundary).
 */
export function shouldGroupMessages(
  prev: Message | undefined,
  current: Message,
  showDaySeparator: boolean,
): boolean {
  if (!prev) return false;
  if (showDaySeparator) return false;
  if (prev.type === "channel_event" || prev.type === "huddle") return false;
  if (current.type === "channel_event" || current.type === "huddle") return false;
  if (prev.userId !== current.userId) return false;
  const diff = Math.abs(new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime());
  return diff < GROUPING_THRESHOLD_MS;
}

/**
 * Returns the user's status emoji if it is set and has not expired.
 */
export function getActiveStatusEmoji(
  presence: { statusEmoji?: string | null; statusExpiresAt?: string | null } | undefined,
): string | null {
  if (!presence?.statusEmoji) return null;
  if (presence.statusExpiresAt && new Date(presence.statusExpiresAt) <= new Date()) return null;
  return presence.statusEmoji;
}

/**
 * Formats a date into a human-readable day label:
 * - "Today" / "Yesterday" for recent dates
 * - "Wednesday, January 15" style for older dates
 */
export function formatDayLabel(date: Date, now?: Date): string {
  const ref = now ?? new Date();
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Formats a huddle duration from a startedAt ISO string to a compact label.
 */
export function formatHuddleDuration(startedAt: string, now?: number): string {
  const diffMs = (now ?? Date.now()) - new Date(startedAt).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min > 0 ? `${hr}h ${min}m` : `${hr}h`;
}

/**
 * Returns initial letters from a display name (e.g. "Alice Bob" → "AB").
 */
export function getInitials(name: string | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

/**
 * Checks whether a message has been edited (updatedAt > createdAt).
 */
export function isMessageEdited(message: { createdAt: string; updatedAt: string }): boolean {
  return new Date(message.updatedAt) > new Date(message.createdAt);
}
