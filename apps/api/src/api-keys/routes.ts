import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { rlRead, rlMemberManage } from "../rate-limit";
import { errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { db } from "../db";
import { apiKeys } from "./schema";
import { generateUserApiKey } from "./token";
import { eq, and } from "drizzle-orm";
import type { BotScope } from "@openslaq/shared";

const BOT_SCOPES = [
  "chat:write",
  "chat:read",
  "channels:read",
  "channels:write",
  "reactions:write",
  "reactions:read",
  "users:read",
  "presence:read",
  "channels:members:read",
  "channels:members:write",
  "commands:write",
] as const;

const apiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.enum(BOT_SCOPES)),
  expiresAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
}).openapi("ApiKey");

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(BOT_SCOPES)).min(1),
  expiresAt: z.string().datetime().optional(),
});

const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.enum(BOT_SCOPES)).min(1).optional(),
});

const keyIdParam = z.object({ id: z.string().describe("API Key ID") });

// ── Route definitions ─────────────────────────────────────────────────

const createKeyRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["API Keys"],
  summary: "Create API key",
  description: "Creates a new user API key. Returns the full token once.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlMemberManage] as const,
  request: {
    body: { content: { "application/json": { schema: createKeySchema } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: apiKeySchema.extend({ token: z.string() }),
        },
      },
      description: "Created API key with token",
    },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Validation error" },
  },
});

const listKeysRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["API Keys"],
  summary: "List API keys",
  description: "Lists all API keys for the current user.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ keys: z.array(apiKeySchema) }),
        },
      },
      description: "List of API keys",
    },
  },
});

const getKeyRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["API Keys"],
  summary: "Get API key",
  description: "Returns metadata for a single API key.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead] as const,
  request: { params: keyIdParam },
  responses: {
    200: { content: { "application/json": { schema: apiKeySchema } }, description: "API key metadata" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Key not found" },
  },
});

const updateKeyRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["API Keys"],
  summary: "Update API key",
  description: "Updates an API key's name or scopes.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlMemberManage] as const,
  request: {
    params: keyIdParam,
    body: { content: { "application/json": { schema: updateKeySchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: apiKeySchema } }, description: "Updated API key" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Key not found" },
  },
});

const deleteKeyRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["API Keys"],
  summary: "Delete API key",
  description: "Revokes and deletes an API key.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlMemberManage] as const,
  request: { params: keyIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Key deleted" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Key not found" },
  },
});

// ── Helpers ────────────────────────────────────────────────────────────

function toApiKeyResponse(row: typeof apiKeys.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    scopes: row.scopes as BotScope[],
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Handler wiring ────────────────────────────────────────────────────

const app = new OpenAPIHono()
  .openapi(createKeyRoute, async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const { token, hash, prefix } = generateUserApiKey();

    const [row] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        name: body.name,
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes: body.scopes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .returning();

    return jsonResponse(c, { ...toApiKeyResponse(row!), token }, 201);
  })
  .openapi(listKeysRoute, async (c) => {
    const user = c.get("user");
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id));
    return jsonResponse(c, { keys: rows.map(toApiKeyResponse) }, 200);
  })
  .openapi(getKeyRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)));
    if (!row) return c.json({ error: "API key not found" }, 404);
    return jsonResponse(c, toApiKeyResponse(row), 200);
  })
  .openapi(updateKeyRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const updates: Partial<{ name: string; scopes: string[] }> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.scopes !== undefined) updates.scopes = body.scopes;

    const [row] = await db
      .update(apiKeys)
      .set(updates)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
      .returning();
    if (!row) return c.json({ error: "API key not found" }, 404);
    return jsonResponse(c, toApiKeyResponse(row), 200);
  })
  .openapi(deleteKeyRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const deleted = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
      .returning();
    if (deleted.length === 0) return c.json({ error: "API key not found" }, 404);
    return c.json({ ok: true as const }, 200);
  });

export default app;
