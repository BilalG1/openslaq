/**
 * Parse a duration string (e.g. "30m", "2h", "1d") or ISO datetime into an ISO string.
 * Throws on invalid input.
 */
export function parseDuration(input: string): string {
  const match = input.match(/^(\d+)(m|h|d)$/);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === "m" ? amount * 60_000 :
      unit === "h" ? amount * 3_600_000 :
      amount * 86_400_000;
    return new Date(Date.now() + ms).toISOString();
  }

  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid duration or datetime: "${input}"`);
  }
  return date.toISOString();
}
