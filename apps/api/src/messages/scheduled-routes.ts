import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMessageSend } from "../rate-limit";
import { jsonResponse } from "../openapi/responses";
import { errorSchema, okSchema } from "../openapi/schemas";
import {
  createScheduledMessage,
  getScheduledMessagesForUser,
  getScheduledCountForChannel,
  getScheduledMessageById,
  updateScheduledMessage,
  deleteScheduledMessage,
} from "./scheduled-service";
import { isChannelMember } from "../channels/service";
import { asChannelId, asUserId, asScheduledMessageId } from "@openslaq/shared";
import { db } from "../db";
import { channels } from "../channels/schema";
import { eq } from "drizzle-orm";
import { getIO } from "../socket/io";
import { createScheduledMessageSchema, updateScheduledMessageSchema } from "./validation";

const scheduledMessageSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  userId: z.string(),
  content: z.string(),
  attachmentIds: z.array(z.string()),
  scheduledFor: z.string(),
  status: z.enum(["pending", "sent", "failed"]),
  failureReason: z.string().nullable(),
  sentMessageId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const scheduledMessageWithChannelSchema = scheduledMessageSchema.extend({
  channelName: z.string(),
});

const createScheduledRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Scheduled Messages"],
  summary: "Schedule a message",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            channelId: z.string().uuid(),
            content: z.string().max(10000).default(""),
            attachmentIds: z.array(z.string().uuid()).max(10).optional().default([]),
            scheduledFor: z.string().datetime(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: scheduledMessageSchema } },
      description: "Scheduled message created",
    },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Validation error" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member or channel archived" },
  },
});

const listScheduledRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Scheduled Messages"],
  summary: "List scheduled messages",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            scheduledMessages: z.array(scheduledMessageWithChannelSchema),
          }),
        },
      },
      description: "List of scheduled messages",
    },
  },
});

const channelCountRoute = createRoute({
  method: "get",
  path: "/channel/:channelId",
  tags: ["Scheduled Messages"],
  summary: "Get scheduled count for channel",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    params: z.object({ channelId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ count: z.number() }) } },
      description: "Count of pending scheduled messages",
    },
  },
});

const getScheduledRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Scheduled Messages"],
  summary: "Get scheduled message",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: scheduledMessageSchema } },
      description: "Scheduled message",
    },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Not found" },
  },
});

const updateScheduledRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Scheduled Messages"],
  summary: "Update scheduled message",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            content: z.string().max(10000).optional(),
            attachmentIds: z.array(z.string().uuid()).max(10).optional(),
            scheduledFor: z.string().datetime().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: scheduledMessageSchema } },
      description: "Updated scheduled message",
    },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Validation error" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Not found or not pending" },
  },
});

const deleteScheduledRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Scheduled Messages"],
  summary: "Delete scheduled message",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Deleted",
    },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Not found or not pending" },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(createScheduledRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const body = c.req.valid("json");

    // Validate with refinements
    const parsed = createScheduledMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);
    }
    const { channelId, content, attachmentIds, scheduledFor } = parsed.data;

    // Check channel exists, not archived, user is member
    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    });
    if (!channel || channel.workspaceId !== workspace.id) {
      return c.json({ error: "Channel not found" }, 403);
    }
    if (channel.isArchived) {
      return c.json({ error: "Channel is archived" }, 403);
    }
    const isMember = await isChannelMember(asChannelId(channelId), asUserId(user.id));
    if (!isMember) {
      return c.json({ error: "Not a channel member" }, 403);
    }

    const scheduled = await createScheduledMessage(
      channelId,
      user.id,
      content,
      new Date(scheduledFor),
      attachmentIds,
    );

    const io = getIO();
    io.to(`user:${user.id}`).emit("scheduledMessage:created", {
      id: scheduled.id,
      channelId: asChannelId(scheduled.channelId),
      scheduledFor: scheduled.scheduledFor,
      status: scheduled.status,
    });

    return jsonResponse(c, scheduled, 201);
  })
  .openapi(listScheduledRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const items = await getScheduledMessagesForUser(user.id, workspace.id);
    return jsonResponse(c, { scheduledMessages: items }, 200);
  })
  .openapi(channelCountRoute, async (c) => {
    const user = c.get("user");
    const { channelId } = c.req.valid("param");
    const cnt = await getScheduledCountForChannel(user.id, channelId);
    return jsonResponse(c, { count: cnt }, 200);
  })
  .openapi(getScheduledRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const item = await getScheduledMessageById(id, user.id);
    if (!item) {
      return c.json({ error: "Scheduled message not found" }, 404);
    }
    return jsonResponse(c, item, 200);
  })
  .openapi(updateScheduledRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const parsed = updateScheduledMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);
    }

    const updates: { content?: string; scheduledFor?: Date; attachmentIds?: string[] } = {};
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.scheduledFor !== undefined) updates.scheduledFor = new Date(parsed.data.scheduledFor);
    if (parsed.data.attachmentIds !== undefined) updates.attachmentIds = parsed.data.attachmentIds;

    const updated = await updateScheduledMessage(id, user.id, updates);
    if (!updated) {
      return c.json({ error: "Scheduled message not found or not pending" }, 404);
    }

    const io = getIO();
    io.to(`user:${user.id}`).emit("scheduledMessage:updated", {
      id: updated.id,
      channelId: asChannelId(updated.channelId),
      scheduledFor: updated.scheduledFor,
      status: updated.status,
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(deleteScheduledRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    // Get the scheduled message first for the socket event
    const existing = await getScheduledMessageById(id, user.id);

    const deleted = await deleteScheduledMessage(id, user.id);
    if (!deleted) {
      return c.json({ error: "Scheduled message not found or not pending" }, 404);
    }

    if (existing) {
      const io = getIO();
      io.to(`user:${user.id}`).emit("scheduledMessage:deleted", {
        id: asScheduledMessageId(id),
        channelId: asChannelId(existing.channelId),
      });
    }

    return jsonResponse(c, { ok: true as const }, 200);
  });

export default app;
