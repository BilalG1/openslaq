import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { asUserId } from "@openslaq/shared";
import { jwks, jwtVerifyOptions, e2eTestSecret } from "./jwt";
import { upsertUser } from "../users/service";
import { db } from "../db";
import { apiKeys } from "../api-keys/schema";
import { users } from "../users/schema";
import { hashToken } from "../api-keys/token";
import type { AuthEnv } from "./types";

const jwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  name: z.string().nullish(),
});

async function verifyAndExtract(token: string) {
  // Try HMAC first when e2e secret is configured (avoids network call)
  if (e2eTestSecret) {
    try {
      const { payload } = await jose.jwtVerify(token, e2eTestSecret);
      return payload;
    } catch {
      // Not an HMAC token — fall through to JWKS
    }
  }

  const { payload } = await jose.jwtVerify(token, jwks, jwtVerifyOptions);
  return payload;
}

async function resolveApiKey(token: string) {
  const hash = hashToken(token);
  const row = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.tokenHash, hash),
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;

  // Update lastUsedAt in the background — don't block the request
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .execute()
    .catch(() => {});

  const user = await db.query.users.findFirst({
    where: eq(users.id, row.userId),
  });
  if (!user) return null;

  return { id: asUserId(user.id), email: user.email, displayName: user.displayName };
}

export const auth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    // API key path
    if (token.startsWith("osk_")) {
      const user = await resolveApiKey(token);
      if (!user) {
        return c.json({ error: "Invalid API key" }, 401);
      }
      c.set("user", user);
      await next();
      return;
    }

    // JWT path
    const payload = await verifyAndExtract(token);
    const parsed = jwtPayloadSchema.parse(payload);

    const userId = parsed.sub;
    const email = parsed.email;
    const displayName = parsed.name ?? email;

    await upsertUser(userId, email, displayName);

    c.set("user", { id: asUserId(userId), email, displayName });
    await next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return c.json({ error: "Invalid token" }, 401);
  }
});
