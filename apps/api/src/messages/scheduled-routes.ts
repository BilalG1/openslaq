import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMessageSend } from "../rate-limit";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { errorSchema, okSchema } from "../openapi/schemas";
import {
  createScheduledMessage,
  getScheduledMessagesForUser,
  getScheduledCountForChannel,
  getScheduledMessageById,
  updateScheduledMessage,
  deleteScheduledMessage,
  getScheduledCountForUser,
  MAX_PENDING_SCHEDULED_PER_USER,
} from "./scheduled-service";
import { isChannelMember } from "../channels/service";
import { asChannelId, asUserId, asScheduledMessageId } from "@openslaq/shared";
import { db } from "../db";
import { channels } from "../channels/schema";
import { eq } from "drizzle-orm";
import { emitToUser } from "../lib/emit";
import { createScheduledMessageSchema, updateScheduledMessageSchema } from "./validation";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";

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
  security: BEARER_SECURITY,
  middleware: [rlMessageSend] as const,
  request: {
    body: jsonBody(z.object({
      channelId: z.string().uuid(),
      content: z.string().max(10000).default(""),
      attachmentIds: z.array(z.string().uuid()).max(10).optional().default([]),
      scheduledFor: z.string().datetime(),
    })),
  },
  responses: {
    201: jsonContent(scheduledMessageSchema, "Scheduled message created"),
    400: jsonContent(errorSchema, "Validation error"),
    403: jsonContent(errorSchema, "Not a channel member or channel archived"),
  },
});

const listScheduledRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Scheduled Messages"],
  summary: "List scheduled messages",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.object({
      scheduledMessages: z.array(scheduledMessageWithChannelSchema),
    }), "List of scheduled messages"),
  },
});

const channelCountRoute = createRoute({
  method: "get",
  path: "/channel/:channelId",
  tags: ["Scheduled Messages"],
  summary: "Get scheduled count for channel",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    params: z.object({ channelId: z.string().uuid() }),
  },
  responses: {
    200: jsonContent(z.object({ count: z.number() }), "Count of pending scheduled messages"),
  },
});

const getScheduledRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Scheduled Messages"],
  summary: "Get scheduled message",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: jsonContent(scheduledMessageSchema, "Scheduled message"),
    404: jsonContent(errorSchema, "Not found"),
  },
});

const updateScheduledRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Scheduled Messages"],
  summary: "Update scheduled message",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: jsonBody(z.object({
      content: z.string().max(10000).optional(),
      attachmentIds: z.array(z.string().uuid()).max(10).optional(),
      scheduledFor: z.string().datetime().optional(),
    })),
  },
  responses: {
    200: jsonContent(scheduledMessageSchema, "Updated scheduled message"),
    400: jsonContent(errorSchema, "Validation error"),
    404: jsonContent(errorSchema, "Not found or not pending"),
  },
});

const deleteScheduledRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Scheduled Messages"],
  summary: "Delete scheduled message",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: jsonContent(okSchema, "Deleted"),
    404: jsonContent(errorSchema, "Not found or not pending"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(createScheduledRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const body = c.req.valid("json");

    // Validate with refinements
    const parsed = createScheduledMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Validation error");
    }
    const { channelId, content, attachmentIds, scheduledFor } = parsed.data;

    // Check channel exists, not archived, user is member
    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    });
    if (!channel || channel.workspaceId !== workspace.id) {
      throw new ForbiddenError("Channel not found");
    }
    if (channel.isArchived) {
      throw new ForbiddenError("Channel is archived");
    }
    const isMember = await isChannelMember(asChannelId(channelId), asUserId(user.id));
    if (!isMember) {
      throw new ForbiddenError("Not a channel member");
    }

    // Check per-user pending scheduled message cap
    const pendingCount = await getScheduledCountForUser(user.id);
    if (pendingCount >= MAX_PENDING_SCHEDULED_PER_USER) {
      throw new BadRequestError(`Maximum ${MAX_PENDING_SCHEDULED_PER_USER} pending scheduled messages allowed`);
    }

    const scheduled = await createScheduledMessage(
      channelId,
      user.id,
      content,
      new Date(scheduledFor),
      attachmentIds,
    );

    emitToUser(user.id, "scheduledMessage:created", {
      id: scheduled.id,
      channelId: asChannelId(scheduled.channelId),
      scheduledFor: scheduled.scheduledFor,
      status: scheduled.status,
    });

    return jsonResponse(c, scheduled, 201);
  })
  .openapi(listScheduledRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const items = await getScheduledMessagesForUser(user.id, workspace.id);
    return jsonResponse(c, { scheduledMessages: items }, 200);
  })
  .openapi(channelCountRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const { channelId } = c.req.valid("param");
    const cnt = await getScheduledCountForChannel(user.id, channelId);
    return jsonResponse(c, { count: cnt }, 200);
  })
  .openapi(getScheduledRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const { id } = c.req.valid("param");
    const item = await getScheduledMessageById(id, user.id);
    if (!item) {
      throw new NotFoundError("Scheduled message");
    }
    return jsonResponse(c, item, 200);
  })
  .openapi(updateScheduledRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const parsed = updateScheduledMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Validation error");
    }

    const updates: { content?: string; scheduledFor?: Date; attachmentIds?: string[] } = {};
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.scheduledFor !== undefined) updates.scheduledFor = new Date(parsed.data.scheduledFor);
    if (parsed.data.attachmentIds !== undefined) updates.attachmentIds = parsed.data.attachmentIds;

    const updated = await updateScheduledMessage(id, user.id, updates);
    if (!updated) {
      throw new NotFoundError("Scheduled message");
    }

    emitToUser(user.id, "scheduledMessage:updated", {
      id: updated.id,
      channelId: asChannelId(updated.channelId),
      scheduledFor: updated.scheduledFor,
      status: updated.status,
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(deleteScheduledRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const { id } = c.req.valid("param");

    // Get the scheduled message first for the socket event
    const existing = await getScheduledMessageById(id, user.id);

    const deleted = await deleteScheduledMessage(id, user.id);
    if (!deleted) {
      throw new NotFoundError("Scheduled message");
    }

    if (existing) {
      emitToUser(user.id, "scheduledMessage:deleted", {
        id: asScheduledMessageId(id),
        channelId: asChannelId(existing.channelId),
      });
    }

    return jsonResponse(c, { ok: true as const }, 200);
  });

export default app;
