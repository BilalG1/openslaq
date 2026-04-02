import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { asUserId, type BotScope } from "@openslaq/shared";
import { jwks, jwtVerifyOptions, e2eTestSecret, builtinJwtSecret } from "./jwt";
import { env } from "../env";
import { getUserById, upsertUser, updateUser } from "../users/service";
import { captureException } from "../sentry";
import { db } from "../db";
import { apiKeys } from "../api-keys/schema";
import { users } from "../users/schema";
import { botApps } from "../bots/schema";
import { hashToken } from "../api-keys/token";
import type { AuthEnv, TokenMeta } from "./types";
import { UnauthorizedError, ForbiddenError } from "../errors";

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
      // Not an HMAC token — fall through
    }
  }

  // Builtin auth mode: verify against local secret
  if (env.AUTH_MODE === "builtin" && builtinJwtSecret) {
    const { payload } = await jose.jwtVerify(token, builtinJwtSecret);
    return payload;
  }

  // Stack Auth mode: verify against remote JWKS
  if (!jwks || !jwtVerifyOptions) {
    throw new Error("Stack Auth not configured");
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

  return {
    user: { id: asUserId(user.id), email: user.email, displayName: user.displayName },
    scopes: row.scopes as BotScope[],
  };
}

async function resolveBotToken(token: string) {
  const hash = hashToken(token);
  const bot = await db.query.botApps.findFirst({
    where: eq(botApps.apiToken, hash),
  });
  if (!bot) return null;
  if (!bot.enabled) return { disabled: true as const };

  return {
    disabled: false as const,
    user: {
      id: asUserId(bot.userId),
      email: `${bot.name.toLowerCase().replace(/\s+/g, "-")}@bot.openslaq`,
      displayName: bot.name,
    },
    scopes: bot.scopes as BotScope[],
    botAppId: bot.id,
    botWorkspaceId: bot.workspaceId,
  };
}

/**
 * If the user has no avatarUrl in our DB, try to fetch their profile image
 * from Stack Auth and store it. Runs in the background (fire-and-forget)
 * so it doesn't slow down requests.
 */
function seedAvatarFromStackAuth(userId: string) {
  if (env.AUTH_MODE !== "stack-auth" || !env.STACK_SECRET_SERVER_KEY) return;

  // Fire-and-forget — don't await
  void (async () => {
    try {
      const existing = await getUserById(userId);
      if (existing?.avatarUrl) return; // already has an avatar

      const { getStackServerApp } = await import("../admin/stack-server");
      const stackServer = getStackServerApp();
      const stackUser = await stackServer.getUser(userId);
      const profileImageUrl = stackUser?.profileImageUrl;
      if (profileImageUrl) {
        await updateUser(userId, { avatarUrl: profileImageUrl });
      }
    } catch (err) {
      captureException(err, { userId, op: "seedAvatarFromStackAuth" });
    }
  })();
}

const JWT_TOKEN_META: TokenMeta = {
  kind: "jwt",
  scopes: null,
  isBot: false,
  botAppId: null,
  botWorkspaceId: null,
};

export const auth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = authHeader.slice(7);

  try {
    // Bot token path
    if (token.startsWith("osb_")) {
      const result = await resolveBotToken(token);
      if (!result) {
        throw new UnauthorizedError("Invalid bot token");
      }
      if (result.disabled) {
        throw new ForbiddenError("Bot is disabled");
      }
      c.set("user", result.user);
      c.set("tokenMeta", {
        kind: "bot",
        scopes: result.scopes,
        isBot: true,
        botAppId: result.botAppId,
        botWorkspaceId: result.botWorkspaceId,
      });
      await next();
      return;
    }

    // API key path
    if (token.startsWith("osk_")) {
      const result = await resolveApiKey(token);
      if (!result) {
        throw new UnauthorizedError("Invalid API key");
      }
      c.set("user", result.user);
      c.set("tokenMeta", {
        kind: "api_key",
        scopes: result.scopes,
        isBot: false,
        botAppId: null,
        botWorkspaceId: null,
      });
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

    // Seed avatar from Stack Auth for users who don't have one yet.
    // Runs in the background to avoid blocking the request.
    seedAvatarFromStackAuth(userId);

    c.set("user", { id: asUserId(userId), email, displayName });
    c.set("tokenMeta", JWT_TOKEN_META);
    await next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("Auth middleware error:", err);
    throw new UnauthorizedError("Invalid token");
  }
});
