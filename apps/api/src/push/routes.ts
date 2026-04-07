import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "../auth/middleware";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { db } from "../db";
import { pushTokens, voipPushTokens, notificationPreferences } from "./schema";
import { rlRead, rlProfileUpdate } from "../rate-limit";
import { okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const registerTokenRoute = createRoute({
  method: "post",
  path: "/push-tokens",
  tags: ["Push"],
  summary: "Register push token",
  description: "Registers or updates a device push token for the current user.",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      token: z.string().min(1).describe("APNs device token"),
      platform: z.enum(["ios"]).describe("Device platform"),
    })),
  },
  responses: {
    200: jsonContent(okSchema, "Token registered"),
  },
});

const unregisterTokenRoute = createRoute({
  method: "delete",
  path: "/push-tokens",
  tags: ["Push"],
  summary: "Unregister push token",
  description: "Removes a device push token (e.g., on sign-out).",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      token: z.string().min(1).describe("APNs device token to remove"),
    })),
  },
  responses: {
    200: jsonContent(okSchema, "Token removed"),
  },
});

const notifPrefsSchema = z.object({
  pushEnabled: z.boolean().describe("Whether push notifications are enabled"),
  soundEnabled: z.boolean().describe("Whether notification sounds are enabled"),
});

const getNotifPrefsRoute = createRoute({
  method: "get",
  path: "/users/me/notification-preferences",
  tags: ["Push"],
  summary: "Get notification preferences",
  description: "Returns the current user's global notification preferences.",
  security: BEARER_SECURITY,
  middleware: [auth, rlRead] as const,
  responses: {
    200: jsonContent(notifPrefsSchema, "Notification preferences"),
  },
});

const updateNotifPrefsRoute = createRoute({
  method: "put",
  path: "/users/me/notification-preferences",
  tags: ["Push"],
  summary: "Update notification preferences",
  description: "Updates the current user's global notification preferences. Partial update via upsert.",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      pushEnabled: z.boolean().optional(),
      soundEnabled: z.boolean().optional(),
    })),
  },
  responses: {
    200: jsonContent(notifPrefsSchema, "Updated notification preferences"),
  },
});

const registerVoipTokenRoute = createRoute({
  method: "post",
  path: "/voip-tokens",
  tags: ["Push"],
  summary: "Register VoIP push token",
  description: "Registers or updates a PushKit VoIP token for the current user (used for CallKit incoming call notifications).",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      token: z.string().min(1).describe("PushKit VoIP device token"),
      platform: z.enum(["ios"]).describe("Device platform"),
    })),
  },
  responses: {
    200: jsonContent(okSchema, "VoIP token registered"),
  },
});

const unregisterVoipTokenRoute = createRoute({
  method: "delete",
  path: "/voip-tokens",
  tags: ["Push"],
  summary: "Unregister VoIP push token",
  description: "Removes a PushKit VoIP token (e.g., on sign-out).",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      token: z.string().min(1).describe("PushKit VoIP token to remove"),
    })),
  },
  responses: {
    200: jsonContent(okSchema, "VoIP token removed"),
  },
});

const app = new OpenAPIHono()
  .openapi(registerTokenRoute, async (c) => {
    const user = c.get("user");
    const { token, platform } = c.req.valid("json");

    // Upsert: if the token already exists (from another user or same user), update it
    await db
      .insert(pushTokens)
      .values({
        userId: user.id,
        token,
        platform,
      })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId: user.id, updatedAt: sql`now()` },
      });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(unregisterTokenRoute, async (c) => {
    const user = c.get("user");
    const { token } = c.req.valid("json");

    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, user.id), eq(pushTokens.token, token)));

    return c.json({ ok: true as const }, 200);
  })
  .openapi(getNotifPrefsRoute, async (c) => {
    const user = c.get("user");

    const [prefs] = await db
      .select({
        pushEnabled: notificationPreferences.pushEnabled,
        soundEnabled: notificationPreferences.soundEnabled,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    return jsonResponse(
      c,
      {
        pushEnabled: prefs?.pushEnabled ?? true,
        soundEnabled: prefs?.soundEnabled ?? true,
      },
      200,
    );
  })
  .openapi(updateNotifPrefsRoute, async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    // Read existing prefs to merge partial updates
    const [existing] = await db
      .select({
        pushEnabled: notificationPreferences.pushEnabled,
        soundEnabled: notificationPreferences.soundEnabled,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    const pushEnabled = body.pushEnabled ?? existing?.pushEnabled ?? true;
    const soundEnabled = body.soundEnabled ?? existing?.soundEnabled ?? true;

    await db
      .insert(notificationPreferences)
      .values({ userId: user.id, pushEnabled, soundEnabled })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          pushEnabled,
          soundEnabled,
          updatedAt: sql`now()`,
        },
      });

    return jsonResponse(c, { pushEnabled, soundEnabled }, 200);
  })
  .openapi(registerVoipTokenRoute, async (c) => {
    const user = c.get("user");
    const { token, platform } = c.req.valid("json");

    await db
      .insert(voipPushTokens)
      .values({
        userId: user.id,
        token,
        platform,
      })
      .onConflictDoUpdate({
        target: voipPushTokens.token,
        set: { userId: user.id, updatedAt: sql`now()` },
      });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(unregisterVoipTokenRoute, async (c) => {
    const user = c.get("user");
    const { token } = c.req.valid("json");

    await db
      .delete(voipPushTokens)
      .where(and(eq(voipPushTokens.userId, user.id), eq(voipPushTokens.token, token)));

    return c.json({ ok: true as const }, 200);
  });

export default app;
