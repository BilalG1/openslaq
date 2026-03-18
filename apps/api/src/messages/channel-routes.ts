import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asMessageId, zChannelId, zMessageId } from "@openslaq/shared";
import { createMessageSchema, messagesPaginationSchema, shareMessageSchema } from "./validation";
import { getMessages, createMessage, getMessageById, getMessagesByIds, getThreadReplies, createThreadReply, getMessagesAround, createSharedMessage } from "./service";
import { isChannelMember } from "../channels/service";
import { pinMessage, unpinMessage, getPinnedMessageIds, getPinnedCount } from "./pinned-service";
import { saveMessage, unsaveMessage } from "./saved-service";
import { unfurlMessageLinks } from "./link-preview-service";
import { getIO } from "../socket/io";
import { resolveChannel, requireChannelMember } from "../channels/middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlMessageSend, rlRead, rlPin } from "../rate-limit";
import { messageListSchema, messageSchema, messagesAroundSchema, errorSchema, okSchema, pinnedCountSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { webhookDispatcher } from "../bots/webhook-dispatcher";
import { scheduleMessagePush } from "../push/service";

const channelIdParam = z.object({ id: zChannelId() });

const getMessagesRoute = createRoute({
  method: "get",
  path: "/:id/messages",
  tags: ["Messages"],
  summary: "List channel messages",
  description: "Returns paginated messages in a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    query: messagesPaginationSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageListSchema } },
      description: "Paginated messages",
    },
  },
});

const createMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages",
  tags: ["Messages"],
  summary: "Send message",
  description: "Sends a message to a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: createMessageSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: messageSchema } },
      description: "Created message",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invalid attachment IDs",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Channel is archived",
    },
  },
});

const getMessagesAroundRoute = createRoute({
  method: "get",
  path: "/:id/messages/around/:messageId",
  tags: ["Messages"],
  summary: "Get messages around target",
  description: "Returns messages surrounding a specific message, useful for scrolling to a message.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      messageId: zMessageId(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messagesAroundSchema } },
      description: "Messages around target",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found",
    },
  },
});

const getThreadRepliesRoute = createRoute({
  method: "get",
  path: "/:id/messages/:messageId/replies",
  tags: ["Messages"],
  summary: "Get thread replies",
  description: "Returns paginated replies to a message thread.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      messageId: zMessageId(),
    }),
    query: messagesPaginationSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageListSchema } },
      description: "Thread replies",
    },
  },
});

const createThreadReplyRoute = createRoute({
  method: "post",
  path: "/:id/messages/:messageId/replies",
  tags: ["Messages"],
  summary: "Reply to thread",
  description: "Creates a reply in a message thread.",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      messageId: zMessageId(),
    }),
    body: { content: { "application/json": { schema: createMessageSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: messageSchema } },
      description: "Created reply",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Cannot reply to a reply or invalid attachment IDs",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Channel is archived",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Parent message not found",
    },
  },
});

const messageIdParam = z.object({
  id: zChannelId(),
  messageId: zMessageId(),
});

const pinMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages/:messageId/pin",
  tags: ["Messages"],
  summary: "Pin message",
  description: "Pins a message in a channel. Any channel member can pin.",
  security: [{ Bearer: [] }],
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Message pinned",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found in channel",
    },
  },
});

const unpinMessageRoute = createRoute({
  method: "delete",
  path: "/:id/messages/:messageId/pin",
  tags: ["Messages"],
  summary: "Unpin message",
  description: "Unpins a message from a channel. Any channel member can unpin.",
  security: [{ Bearer: [] }],
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Message unpinned",
    },
  },
});

const listPinsRoute = createRoute({
  method: "get",
  path: "/:id/pins",
  tags: ["Messages"],
  summary: "List pinned messages",
  description: "Returns all pinned messages in a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ messages: z.array(messageSchema) }) } },
      description: "Pinned messages",
    },
  },
});

const pinCountRoute = createRoute({
  method: "get",
  path: "/:id/pin-count",
  tags: ["Messages"],
  summary: "Get pinned message count",
  description: "Returns the number of pinned messages in a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: pinnedCountSchema } },
      description: "Pinned message count",
    },
  },
});

const shareMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages/share",
  tags: ["Messages"],
  summary: "Share message",
  description: "Shares a message from another channel into this channel as a quoted block with an optional comment.",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: shareMessageSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: messageSchema } },
      description: "Shared message created",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Channel is archived or user not a member of source channel",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Source message not found",
    },
  },
});

const saveMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages/:messageId/save",
  tags: ["Saved Messages"],
  summary: "Save message",
  description: "Saves a message for later reference. Private to the current user.",
  security: [{ Bearer: [] }],
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Message saved",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found",
    },
  },
});

const unsaveMessageRoute = createRoute({
  method: "delete",
  path: "/:id/messages/:messageId/save",
  tags: ["Saved Messages"],
  summary: "Unsave message",
  description: "Removes a message from saved items.",
  security: [{ Bearer: [] }],
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Message unsaved",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getMessagesRoute, async (c) => {
    const channel = c.get("channel");
    const { cursor, limit, direction } = c.req.valid("query");
    const result = await getMessages(channel.id, cursor, limit, direction);
    return jsonResponse(c, result, 200);
  })
  .openapi(createMessageRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");

    if (channel.isArchived) {
      return c.json({ error: "Channel is archived" }, 403);
    }

    const { content, attachmentIds } = c.req.valid("json");

    const message = await createMessage(channel.id, user.id, content, attachmentIds);
    if ("error" in message) {
      return c.json({ error: message.error }, 400);
    }

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("message:new", message);
    webhookDispatcher.dispatch({ type: "message:new", channelId: channel.id, workspaceId: c.get("workspace").id, data: message });
    unfurlMessageLinks(message.id, channel.id, content).catch(console.error);
    scheduleMessagePush(message, c.get("workspace").slug).catch(console.error);
    return jsonResponse(c, message, 201);
  })
  .openapi(getMessagesAroundRoute, async (c) => {
    const channel = c.get("channel");
    const messageId = c.req.valid("param").messageId;
    const result = await getMessagesAround(channel.id, messageId);
    if (!result.targetFound) {
      return c.json({ error: "Message not found" }, 404);
    }
    return jsonResponse(c, result, 200);
  })
  .openapi(getThreadRepliesRoute, async (c) => {
    const channel = c.get("channel");
    const messageId = c.req.valid("param").messageId;
    const { cursor, limit, direction } = c.req.valid("query");
    const result = await getThreadReplies(messageId, channel.id, cursor, limit, direction);
    return jsonResponse(c, result, 200);
  })
  .openapi(createThreadReplyRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");

    if (channel.isArchived) {
      return c.json({ error: "Channel is archived" }, 403);
    }

    const messageId = c.req.valid("param").messageId;
    const { content, attachmentIds } = c.req.valid("json");

    const result = await createThreadReply(messageId, channel.id, user.id, content, attachmentIds);

    if ("error" in result) {
      if (result.error === "Cannot reply to a reply" || result.error === "One or more attachments are invalid or already linked") {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ error: result.error }, 404);
    }

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("message:new", result.reply);
    io.to(`channel:${channel.id}`).emit("thread:updated", result.threadUpdate);
    webhookDispatcher.dispatch({ type: "message:new", channelId: channel.id, workspaceId: c.get("workspace").id, data: result.reply });
    unfurlMessageLinks(result.reply.id, channel.id, content).catch(console.error);
    scheduleMessagePush(result.reply, c.get("workspace").slug).catch(console.error);

    return jsonResponse(c, result.reply, 201);
  })
  .openapi(pinMessageRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    const messageId = c.req.valid("param").messageId;

    const result = await pinMessage(channel.id, messageId, user.id);
    if (!result) {
      return c.json({ error: "Message not found in channel" }, 404);
    }

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("message:pinned", {
      messageId,
      channelId: channel.id,
      pinnedBy: user.id,
      pinnedAt: result.pinnedAt.toISOString(),
    });

    webhookDispatcher.dispatch({
      type: "message:pinned",
      channelId: channel.id,
      workspaceId: c.get("workspace").id,
      data: { messageId, channelId: channel.id, pinnedBy: user.id, pinnedAt: result.pinnedAt.toISOString() },
    });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(unpinMessageRoute, async (c) => {
    const channel = c.get("channel");
    const messageId = c.req.valid("param").messageId;

    await unpinMessage(channel.id, messageId);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("message:unpinned", {
      messageId,
      channelId: channel.id,
    });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(pinCountRoute, async (c) => {
    const channel = c.get("channel");
    const count = await getPinnedCount(channel.id);
    return jsonResponse(c, { count }, 200);
  })
  .openapi(listPinsRoute, async (c) => {
    const channel = c.get("channel");
    const pinnedIds = await getPinnedMessageIds(channel.id);

    const msgs = await getMessagesByIds(pinnedIds);
    // Reorder to match pin order (pinnedIds is already ordered by pinnedAt DESC)
    const msgMap = new Map(msgs.map((m) => [m.id, m]));
    const validMessages = pinnedIds.map((id) => msgMap.get(id)).filter((m): m is NonNullable<typeof m> => m != null);

    return jsonResponse(c, { messages: validMessages }, 200);
  })
  .openapi(shareMessageRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");

    if (channel.isArchived) {
      return c.json({ error: "Channel is archived" }, 403);
    }

    const { sharedMessageId, comment } = c.req.valid("json");

    // Verify source message exists
    const sourceMessage = await getMessageById(asMessageId(sharedMessageId));
    if (!sourceMessage) {
      return c.json({ error: "Source message not found" }, 404);
    }

    // Verify user is a member of source channel
    const isMember = await isChannelMember(sourceMessage.channelId, user.id);
    if (!isMember) {
      return c.json({ error: "Not a member of source channel" }, 403);
    }

    const message = await createSharedMessage(
      channel.id,
      user.id,
      asMessageId(sharedMessageId),
      comment,
    );

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("message:new", message);

    return jsonResponse(c, message, 201);
  })
  .openapi(saveMessageRoute, async (c) => {
    const user = c.get("user");
    const messageId = c.req.valid("param").messageId;

    const result = await saveMessage(user.id, messageId);
    if (!result) {
      return c.json({ error: "Message not found" }, 404);
    }

    return c.json({ ok: true as const }, 200);
  })
  .openapi(unsaveMessageRoute, async (c) => {
    const user = c.get("user");
    const messageId = c.req.valid("param").messageId;

    await unsaveMessage(user.id, messageId);

    return c.json({ ok: true as const }, 200);
  });

export default app;
