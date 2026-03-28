import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../auth/types";
import { checkRateLimit } from "./store";
import { env } from "../env";

const isDev = env.NODE_ENV === "development";

interface RateLimitConfig {
  bucket: string;
  max: number;
  windowSec: number;
}

export function rateLimit(config: RateLimitConfig) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    if (isDev) return next();
    const userId = c.get("user").id;
    const key = `${config.bucket}:${userId}`;
    const result = await checkRateLimit(key, config.max, config.windowSec);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return c.json({ error: "Too many requests" } as const, 429, {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        "Retry-After": String(Math.max(retryAfter, 1)),
      });
    }

    await next();
  });
}

function getClientIp(c: Parameters<ReturnType<typeof createMiddleware>>[0]): string {
  // Try getConnInfo from @hono/node-server when running under the Node adapter
  try {
    const { getConnInfo } = require("@hono/node-server/conninfo");
    const info = getConnInfo(c);
    if (info?.remote?.address) return info.remote.address;
  } catch {
    // Not running under node-server adapter (e.g. Bun.serve in tests)
  }
  // Fallback: use request headers (less reliable but better than crashing)
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitByIp(config: RateLimitConfig) {
  return createMiddleware(async (c, next) => {
    if (isDev) return next();
    const ip = getClientIp(c);
    const key = `${config.bucket}:${ip}`;
    const result = await checkRateLimit(key, config.max, config.windowSec);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return c.json({ error: "Too many requests" } as const, 429, {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        "Retry-After": String(Math.max(retryAfter, 1)),
      });
    }

    await next();
  });
}
