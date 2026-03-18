import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { requireRole } from "../workspaces/role-middleware";
import { ROLES } from "@openslaq/shared";
import type { BotEventType, BotScope } from "@openslaq/shared";
import { rlRead, rlMemberManage } from "../rate-limit";
import { errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import {
  createBotApp,
  listBotApps,
  getBotAppById,
  updateBotApp,
  deleteBotApp,
  regenerateToken,
  toggleBotEnabled,
} from "./service";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { botSlashCommands } from "../commands/slash-command-schema";

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

const BOT_EVENT_TYPES = [
  "message:new",
  "message:updated",
  "message:deleted",
  "reaction:updated",
  "channel:updated",
  "channel:member-added",
  "channel:member-removed",
  "message:pinned",
  "message:unpinned",
  "presence:updated",
  "interaction",
  "slash_command",
] as const;

const botAppSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  webhookUrl: z.string(),
  apiTokenPrefix: z.string(),
  scopes: z.array(z.enum(BOT_SCOPES)),
  subscribedEvents: z.array(z.enum(BOT_EVENT_TYPES)),
  enabled: z.boolean(),
  marketplaceListingId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
}).openapi("BotApp");

const createBotSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  webhookUrl: z.string().url(),
  scopes: z.array(z.enum(BOT_SCOPES)).min(1),
  subscribedEvents: z.array(z.enum(BOT_EVENT_TYPES)).optional().default([]),
});

const updateBotSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  webhookUrl: z.string().url().optional(),
  scopes: z.array(z.enum(BOT_SCOPES)).optional(),
  subscribedEvents: z.array(z.enum(BOT_EVENT_TYPES)).optional(),
});

const botIdParam = z.object({ botId: z.string().describe("Bot App ID") });

const listBotsRoute = createRoute({
  method: "get",
  path: "/bots",
  tags: ["Bots"],
  summary: "List bots",
  description: "Lists all bot apps in the workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  responses: {
    200: { content: { "application/json": { schema: z.array(botAppSchema) } }, description: "List of bots" },
  },
});

const createBotRoute = createRoute({
  method: "post",
  path: "/bots",
  tags: ["Bots"],
  summary: "Create bot app",
  description: "Creates a new bot app. Returns the API token once.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: { content: { "application/json": { schema: createBotSchema } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ bot: botAppSchema, apiToken: z.string() }),
        },
      },
      description: "Created bot with API token",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Quota exceeded",
    },
  },
});

const getBotRoute = createRoute({
  method: "get",
  path: "/bots/:botId",
  tags: ["Bots"],
  summary: "Get bot details",
  description: "Returns details of a bot app.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  request: { params: botIdParam },
  responses: {
    200: { content: { "application/json": { schema: botAppSchema } }, description: "Bot details" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

const updateBotRoute = createRoute({
  method: "put",
  path: "/bots/:botId",
  tags: ["Bots"],
  summary: "Update bot config",
  description: "Updates a bot app configuration.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: botIdParam,
    body: { content: { "application/json": { schema: updateBotSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: botAppSchema } }, description: "Updated bot" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

const deleteBotRoute = createRoute({
  method: "delete",
  path: "/bots/:botId",
  tags: ["Bots"],
  summary: "Delete bot",
  description: "Deletes a bot app and its associated user.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: { params: botIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Bot deleted" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

const regenerateTokenRoute = createRoute({
  method: "post",
  path: "/bots/:botId/regenerate-token",
  tags: ["Bots"],
  summary: "Regenerate API token",
  description: "Regenerates the bot's API token. Returns the new token once.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: { params: botIdParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ apiToken: z.string(), apiTokenPrefix: z.string() }),
        },
      },
      description: "New API token",
    },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

const toggleBotRoute = createRoute({
  method: "post",
  path: "/bots/:botId/toggle",
  tags: ["Bots"],
  summary: "Enable/disable bot",
  description: "Toggles a bot app's enabled state.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: botIdParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({ enabled: z.boolean() }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Toggled" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

// ── Bot Slash Commands ──────────────────────────────────────────────────

const botCommandSchema = z.object({
  id: z.string(),
  botAppId: z.string(),
  name: z.string(),
  description: z.string(),
  usage: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
});

const createBotCommandSchema = z.object({
  name: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(500).default(""),
  usage: z.string().max(200).default(""),
});

const listBotCommandsRoute = createRoute({
  method: "get",
  path: "/bots/:botId/commands",
  tags: ["Bots"],
  summary: "List bot slash commands",
  security: [{ Bearer: [] }],
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  request: { params: botIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.array(botCommandSchema) } }, description: "Bot commands" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

const createBotCommandRoute = createRoute({
  method: "post",
  path: "/bots/:botId/commands",
  tags: ["Bots"],
  summary: "Register a bot slash command",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: botIdParam,
    body: { content: { "application/json": { schema: createBotCommandSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: botCommandSchema } }, description: "Created command" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Bot not found" },
  },
});

const deleteBotCommandRoute = createRoute({
  method: "delete",
  path: "/bots/:botId/commands/:commandId",
  tags: ["Bots"],
  summary: "Delete a bot slash command",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: z.object({
      botId: z.string(),
      commandId: z.string(),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Command deleted" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Not found" },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listBotsRoute, async (c) => {
    const workspace = c.get("workspace");
    const bots = await listBotApps(workspace.id);
    return jsonResponse(c, bots, 200);
  })
  .openapi(createBotRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const body = c.req.valid("json");

    // Cap bots per workspace
    const existingBots = await listBotApps(workspace.id);
    if (existingBots.length >= 25) {
      return c.json({ error: "Maximum 25 bots per workspace" }, 400);
    }

    const result = await createBotApp(
      workspace.id,
      body.name,
      body.description ?? null,
      body.avatarUrl ?? null,
      body.webhookUrl,
      body.scopes as BotScope[],
      body.subscribedEvents as BotEventType[],
      user.id,
    );
    return jsonResponse(c, result, 201);
  })
  .openapi(getBotRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const bot = await getBotAppById(botId, workspace.id);
    if (!bot) return c.json({ error: "Bot not found" }, 404);
    return jsonResponse(c, bot, 200);
  })
  .openapi(updateBotRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const body = c.req.valid("json");
    const updated = await updateBotApp(botId, workspace.id, {
      name: body.name,
      description: body.description,
      avatarUrl: body.avatarUrl,
      webhookUrl: body.webhookUrl,
      scopes: body.scopes as BotScope[] | undefined,
      subscribedEvents: body.subscribedEvents as BotEventType[] | undefined,
    });
    if (!updated) return c.json({ error: "Bot not found" }, 404);
    return jsonResponse(c, updated, 200);
  })
  .openapi(deleteBotRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const deleted = await deleteBotApp(botId, workspace.id);
    if (!deleted) return c.json({ error: "Bot not found" }, 404);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(regenerateTokenRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const result = await regenerateToken(botId, workspace.id);
    if (!result) return c.json({ error: "Bot not found" }, 404);
    return jsonResponse(c, result, 200);
  })
  .openapi(toggleBotRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const { enabled } = c.req.valid("json");
    const ok = await toggleBotEnabled(botId, workspace.id, enabled);
    if (!ok) return c.json({ error: "Bot not found" }, 404);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(listBotCommandsRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const bot = await getBotAppById(botId, workspace.id);
    if (!bot) return c.json({ error: "Bot not found" }, 404);
    const commands = await db
      .select()
      .from(botSlashCommands)
      .where(eq(botSlashCommands.botAppId, botId))
      .limit(100);
    return jsonResponse(
      c,
      commands.map((cmd) => ({
        id: cmd.id,
        botAppId: cmd.botAppId,
        name: cmd.name,
        description: cmd.description,
        usage: cmd.usage,
        enabled: cmd.enabled,
        createdAt: cmd.createdAt.toISOString(),
      })),
      200,
    );
  })
  .openapi(createBotCommandRoute, async (c) => {
    const workspace = c.get("workspace");
    const botId = c.req.valid("param").botId;
    const bot = await getBotAppById(botId, workspace.id);
    if (!bot) return c.json({ error: "Bot not found" }, 404);
    const body = c.req.valid("json");
    const [row] = await db
      .insert(botSlashCommands)
      .values({
        botAppId: botId,
        name: body.name,
        description: body.description,
        usage: body.usage,
      })
      .returning();
    return jsonResponse(
      c,
      {
        id: row!.id,
        botAppId: row!.botAppId,
        name: row!.name,
        description: row!.description,
        usage: row!.usage,
        enabled: row!.enabled,
        createdAt: row!.createdAt.toISOString(),
      },
      201,
    );
  })
  .openapi(deleteBotCommandRoute, async (c) => {
    const workspace = c.get("workspace");
    const { botId, commandId } = c.req.valid("param");
    // Verify bot belongs to workspace
    const bot = await getBotAppById(botId, workspace.id);
    if (!bot) return c.json({ error: "Bot not found" }, 404);
    const deleted = await db
      .delete(botSlashCommands)
      .where(
        and(
          eq(botSlashCommands.id, commandId),
          eq(botSlashCommands.botAppId, botId),
        ),
      )
      .returning();
    if (deleted.length === 0) return c.json({ error: "Command not found" }, 404);
    return c.json({ ok: true as const }, 200);
  });

export default app;
