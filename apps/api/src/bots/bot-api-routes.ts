import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asChannelId, asWorkspaceId, zChannelId, zMessageId } from "@openslaq/shared";
import type { BotMessage } from "@openslaq/shared";
import type { BotAuthEnv } from "./auth-middleware";
import { botAuth, requireScope } from "./auth-middleware";
import { rlBotSend, rlBotRead } from "../rate-limit";
import { isChannelMember, listChannels, listChannelMembers } from "../channels/service";
import { createMessage, getMessages, editMessage, deleteMessage, getMessageById } from "../messages/service";
import { messages } from "../messages/schema";
import { toggleReaction } from "../reactions/service";
import { setMessageActions } from "./service";
import { getIO } from "../socket/io";
import { db } from "../db";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import { eq, and } from "drizzle-orm";
import { errorSchema, messageSchema, messageListSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const channelIdParam = z.object({ id: zChannelId() });
const messageIdParam = z.object({ id: zMessageId() });

// --- Send message ---
const sendMessageRoute = createRoute({
  method: "post",
  path: "/channels/:id/messages",
  tags: ["Bots"],
  summary: "Bot: Send message",
  description: "Send a message to a channel as a bot.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotSend, requireScope("chat:write")] as const,
  request: {
    params: channelIdParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            content: z.string().min(1).max(40000),
            actions: z.array(z.object({
              id: z.string(),
              type: z.literal("button"),
              label: z.string().max(80),
              style: z.enum(["primary", "danger", "default"]).optional(),
              value: z.string().optional(),
            })).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { content: { "application/json": { schema: messageSchema } }, description: "Message sent" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member or missing scope" },
  },
});

// --- Update message ---
const updateMessageRoute = createRoute({
  method: "put",
  path: "/messages/:id",
  tags: ["Bots"],
  summary: "Bot: Update message",
  description: "Update a bot's own message.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotSend, requireScope("chat:write")] as const,
  request: {
    params: messageIdParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            content: z.string().min(1).max(40000).optional(),
            actions: z.array(z.object({
              id: z.string(),
              type: z.literal("button"),
              label: z.string().max(80),
              style: z.enum(["primary", "danger", "default"]).optional(),
              value: z.string().optional(),
            })).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: messageSchema } }, description: "Message updated" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message not found" },
  },
});

// --- Delete message ---
const deleteMessageRoute = createRoute({
  method: "delete",
  path: "/messages/:id",
  tags: ["Bots"],
  summary: "Bot: Delete message",
  description: "Delete a bot's own message.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotSend, requireScope("chat:write")] as const,
  request: { params: messageIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.literal(true) }) } }, description: "Deleted" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message not found" },
  },
});

// --- Read channel messages ---
const readMessagesRoute = createRoute({
  method: "get",
  path: "/channels/:id/messages",
  tags: ["Bots"],
  summary: "Bot: Read channel messages",
  description: "Read message history from a channel.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotRead, requireScope("chat:read")] as const,
  request: {
    params: channelIdParam,
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: messageListSchema } }, description: "Messages" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member" },
  },
});

// --- List channels ---
const listChannelsRoute = createRoute({
  method: "get",
  path: "/channels",
  tags: ["Bots"],
  summary: "Bot: List channels",
  description: "List channels the bot is a member of.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotRead, requireScope("channels:read")] as const,
  responses: {
    200: { content: { "application/json": { schema: z.array(z.object({ id: z.string(), name: z.string(), type: z.string() })) } }, description: "Channels" },
  },
});

// --- List channel members ---
const listMembersRoute = createRoute({
  method: "get",
  path: "/channels/:id/members",
  tags: ["Bots"],
  summary: "Bot: List channel members",
  description: "List members of a channel.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotRead, requireScope("channels:members:read")] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.array(z.object({ id: z.string(), displayName: z.string() })) } }, description: "Members" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member" },
  },
});

// --- Toggle reaction ---
const toggleReactionRoute = createRoute({
  method: "post",
  path: "/messages/:id/reactions",
  tags: ["Bots"],
  summary: "Bot: Toggle reaction",
  description: "Add or remove a reaction on a message.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotSend, requireScope("reactions:write")] as const,
  request: {
    params: messageIdParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({ emoji: z.string().min(1).max(32) }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ reactions: z.array(z.object({ emoji: z.string(), count: z.number(), userIds: z.array(z.string()) })) }) } }, description: "Reactions" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message not found" },
  },
});

// --- Get user info ---
const getUserRoute = createRoute({
  method: "get",
  path: "/users/:id",
  tags: ["Bots"],
  summary: "Bot: Get user",
  description: "Get information about a user.",
  security: [{ Bearer: [] }],
  middleware: [botAuth, rlBotRead, requireScope("users:read")] as const,
  request: { params: z.object({ id: z.string().describe("User ID") }) },
  responses: {
    200: { content: { "application/json": { schema: z.object({ id: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }) } }, description: "User" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "User not found" },
  },
});

const app = new OpenAPIHono<BotAuthEnv>()
  .openapi(sendMessageRoute, async (c) => {
    const user = c.get("user");
    const botAppId = c.get("botAppId");
    const channelId = c.req.valid("param").id;
    const { content, actions } = c.req.valid("json");

    const isMember = await isChannelMember(channelId, user.id);
    if (!isMember) {
      return c.json({ error: "Bot is not a member of this channel" }, 403);
    }

    const message = await createMessage(channelId, user.id, content);
    if ("error" in message) {
      return c.json({ error: message.error }, 403);
    }

    // Store actions if provided
    if (actions && actions.length > 0) {
      await setMessageActions(message.id, botAppId, actions);
    }

    // Add bot info to the message for the socket emit
    const enriched = {
      ...message,
      isBot: true as const,
      botAppId,
      actions: actions ?? [],
    } as BotMessage;

    const io = getIO();
    io.to(`channel:${channelId}`).emit("message:new", enriched);

    return jsonResponse(c, enriched, 201);
  })
  .openapi(updateMessageRoute, async (c) => {
    const user = c.get("user");
    const botAppId = c.get("botAppId");
    const messageId = c.req.valid("param").id;
    const { content, actions } = c.req.valid("json");

    // Fetch the message first, verify channel membership, THEN edit
    const msg = await getMessageById(messageId);
    if (!msg) {
      return c.json({ error: "Message not found or not yours" }, 404);
    }

    const isMember = await isChannelMember(asChannelId(msg.channelId), user.id);
    if (!isMember) {
      return c.json({ error: "Bot is not a member of this channel" }, 403);
    }

    const updated = await editMessage(messageId, user.id, content ?? "");
    if (!updated) {
      return c.json({ error: "Message not found or not yours" }, 404);
    }

    // Update actions if provided
    if (actions !== undefined) {
      await setMessageActions(updated.id, botAppId, actions);
    }

    const enriched = {
      ...updated,
      isBot: true as const,
      botAppId,
      actions: actions ?? [],
    } as BotMessage;

    const io = getIO();
    io.to(`channel:${updated.channelId}`).emit("message:updated", enriched);

    return jsonResponse(c, enriched, 200);
  })
  .openapi(deleteMessageRoute, async (c) => {
    const user = c.get("user");
    const messageId = c.req.valid("param").id;

    // Look up the message's channel and verify membership before deleting
    const msg = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      columns: { channelId: true },
    });
    if (msg) {
      const isMember = await isChannelMember(asChannelId(msg.channelId), user.id);
      if (!isMember) {
        return c.json({ error: "Bot is not a member of this channel" }, 403);
      }
    }

    const deleted = await deleteMessage(messageId, user.id);
    if (!deleted) {
      return c.json({ error: "Message not found or not yours" }, 404);
    }

    const io = getIO();
    io.to(`channel:${deleted.channelId}`).emit("message:deleted", { id: deleted.id, channelId: deleted.channelId });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(readMessagesRoute, async (c) => {
    const user = c.get("user");
    const channelId = c.req.valid("param").id;
    const { cursor, limit } = c.req.valid("query");

    const isMember = await isChannelMember(channelId, user.id);
    if (!isMember) {
      return c.json({ error: "Bot is not a member of this channel" }, 403);
    }

    const result = await getMessages(channelId, cursor, limit);
    return jsonResponse(c, result, 200);
  })
  .openapi(listChannelsRoute, async (c) => {
    const workspaceId = asWorkspaceId(c.get("botWorkspaceId"));
    const user = c.get("user");
    const channels = await listChannels(workspaceId, user.id);
    return jsonResponse(c, channels, 200);
  })
  .openapi(listMembersRoute, async (c) => {
    const user = c.get("user");
    const channelId = c.req.valid("param").id;

    const isMember = await isChannelMember(channelId, user.id);
    if (!isMember) {
      return c.json({ error: "Bot is not a member of this channel" }, 403);
    }

    const members = await listChannelMembers(channelId);
    return jsonResponse(c, members, 200);
  })
  .openapi(toggleReactionRoute, async (c) => {
    const user = c.get("user");
    const messageId = c.req.valid("param").id;
    const { emoji } = c.req.valid("json");

    // Look up the message's channel and verify bot membership
    const msg = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      columns: { channelId: true },
    });
    if (!msg) {
      return c.json({ error: "Message not found" }, 404);
    }
    const isMember = await isChannelMember(asChannelId(msg.channelId), user.id);
    if (!isMember) {
      return c.json({ error: "Bot is not a member of this channel" }, 403);
    }

    const result = await toggleReaction(messageId, user.id, emoji);
    if (!result) {
      return c.json({ error: "Message not found" }, 404);
    }

    const io = getIO();
    io.to(`channel:${result.channelId}`).emit("reaction:updated", {
      messageId,
      channelId: result.channelId,
      reactions: result.reactions,
    });

    return jsonResponse(c, { reactions: result.reactions }, 200);
  })
  .openapi(getUserRoute, async (c) => {
    const userId = c.req.valid("param").id;
    const botWorkspaceId = c.get("botWorkspaceId");

    // Verify the user is a member of the bot's workspace
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, botWorkspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    });
    if (!membership) {
      return c.json({ error: "User not found" }, 404);
    }

    const userRow = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!userRow) {
      return c.json({ error: "User not found" }, 404);
    }
    return jsonResponse(c, {
      id: userRow.id,
      displayName: userRow.displayName,
      avatarUrl: userRow.avatarUrl,
    }, 200);
  });

export default app;
