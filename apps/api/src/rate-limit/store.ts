import postgres from "postgres";
import { env } from "../env";
import { captureException } from "../sentry";

const sql = postgres(env.DATABASE_URL, { max: 3 });

let enabled = true;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!enabled) {
    return { allowed: true, limit: max, remaining: max, resetAt: Date.now() + windowSec * 1000 };
  }

  const now = new Date();
  const windowMs = windowSec * 1000;

  const rows = await sql`
    INSERT INTO rate_limit_entries (key, count, window_start)
    VALUES (${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit_entries.window_start < ${new Date(now.getTime() - windowMs)} THEN 1
        ELSE rate_limit_entries.count + 1
      END,
      window_start = CASE
        WHEN rate_limit_entries.window_start < ${new Date(now.getTime() - windowMs)} THEN ${now}
        ELSE rate_limit_entries.window_start
      END
    RETURNING count, window_start
  `;

  const row = rows[0]!;
  const count = row.count as number;
  const windowStart = new Date(row.window_start as string).getTime();
  const resetAt = windowStart + windowMs;

  if (count > max) {
    return {
      allowed: false,
      limit: max,
      remaining: 0,
      resetAt,
    };
  }

  return {
    allowed: true,
    limit: max,
    remaining: max - count,
    resetAt,
  };
}

export async function cleanupExpiredEntries(): Promise<void> {
  await sql`DELETE FROM rate_limit_entries WHERE window_start < now() - interval '120 seconds'`;
}

export function startCleanup() {
  return setInterval(() => {
    cleanupExpiredEntries().catch((err) => captureException(err, { op: "rate-limit:cleanup" }));
  }, 60_000);
}

export async function resetStore(): Promise<void> {
  await sql`DELETE FROM rate_limit_entries`;
}

export function setEnabled(value: boolean) {
  enabled = value;
}
