import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asMessageId, zChannelId, zMessageId } from "@openslaq/shared";
import { createMessageSchema, messagesPaginationSchema, shareMessageSchema } from "./validation";
import { getMessages, createMessage, getMessageById, getMessagesByIds, getThreadReplies, createThreadReply, getMessagesAround, createSharedMessage } from "./service";
import { isChannelMember } from "../channels/service";
import { pinMessage, unpinMessage, getPinnedMessageIds, getPinnedCount } from "./pinned-service";
import { saveMessage, unsaveMessage } from "./saved-service";
import { unfurlMessageLinks } from "./link-preview-service";
import { emitToChannel } from "../lib/emit";
import { resolveChannel, requireChannelMember } from "../channels/middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { requireScope } from "../auth/scope-middleware";
import { getChannelContext } from "../lib/context";
import { setMessageActions } from "../bots/service";
import type { BotMessage } from "@openslaq/shared";
import { rlMessageSend, rlRead, rlPin } from "../rate-limit";
import { messageListSchema, messageSchema, messagesAroundSchema, errorSchema, okSchema, pinnedCountSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { webhookDispatcher } from "../bots/webhook-dispatcher";
import { scheduleMessagePush } from "../push/service";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";

const channelIdParam = z.object({ id: zChannelId() });

const getMessagesRoute = createRoute({
  method: "get",
  path: "/:id/messages",
  tags: ["Messages"],
  summary: "List channel messages",
  description: "Returns paginated messages in a channel.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("chat:read"), resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    query: messagesPaginationSchema,
  },
  responses: {
    200: jsonContent(messageListSchema, "Paginated messages"),
  },
});

const createMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages",
  tags: ["Messages"],
  summary: "Send message",
  description: "Sends a message to a channel.",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend, requireScope("chat:write"), resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(createMessageSchema),
  },
  responses: {
    201: jsonContent(messageSchema, "Created message"),
    400: jsonContent(errorSchema, "Invalid attachment IDs"),
    403: jsonContent(errorSchema, "Channel is archived"),
  },
});

const getMessagesAroundRoute = createRoute({
  method: "get",
  path: "/:id/messages/around/:messageId",
  tags: ["Messages"],
  summary: "Get messages around target",
  description: "Returns messages surrounding a specific message, useful for scrolling to a message.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("chat:read"), resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      messageId: zMessageId(),
    }),
  },
  responses: {
    200: jsonContent(messagesAroundSchema, "Messages around target"),
    404: jsonContent(errorSchema, "Message not found"),
  },
});

const getThreadRepliesRoute = createRoute({
  method: "get",
  path: "/:id/messages/:messageId/replies",
  tags: ["Messages"],
  summary: "Get thread replies",
  description: "Returns paginated replies to a message thread.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("chat:read"), resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      messageId: zMessageId(),
    }),
    query: messagesPaginationSchema,
  },
  responses: {
    200: jsonContent(messageListSchema, "Thread replies"),
  },
});

const createThreadReplyRoute = createRoute({
  method: "post",
  path: "/:id/messages/:messageId/replies",
  tags: ["Messages"],
  summary: "Reply to thread",
  description: "Creates a reply in a message thread.",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend, requireScope("chat:write"), resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      messageId: zMessageId(),
    }),
    body: jsonBody(createMessageSchema),
  },
  responses: {
    201: jsonContent(messageSchema, "Created reply"),
    400: jsonContent(errorSchema, "Cannot reply to a reply or invalid attachment IDs"),
    403: jsonContent(errorSchema, "Channel is archived"),
    404: jsonContent(errorSchema, "Parent message not found"),
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
  security: BEARER_SECURITY,
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: jsonContent(okSchema, "Message pinned"),
    404: jsonContent(errorSchema, "Message not found in channel"),
  },
});

const unpinMessageRoute = createRoute({
  method: "delete",
  path: "/:id/messages/:messageId/pin",
  tags: ["Messages"],
  summary: "Unpin message",
  description: "Unpins a message from a channel. Any channel member can unpin.",
  security: BEARER_SECURITY,
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: jsonContent(okSchema, "Message unpinned"),
  },
});

const listPinsRoute = createRoute({
  method: "get",
  path: "/:id/pins",
  tags: ["Messages"],
  summary: "List pinned messages",
  description: "Returns all pinned messages in a channel.",
  security: BEARER_SECURITY,
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(z.object({ messages: z.array(messageSchema) }), "Pinned messages"),
  },
});

const pinCountRoute = createRoute({
  method: "get",
  path: "/:id/pin-count",
  tags: ["Messages"],
  summary: "Get pinned message count",
  description: "Returns the number of pinned messages in a channel.",
  security: BEARER_SECURITY,
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(pinnedCountSchema, "Pinned message count"),
  },
});

const shareMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages/share",
  tags: ["Messages"],
  summary: "Share message",
  description: "Shares a message from another channel into this channel as a quoted block with an optional comment.",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(shareMessageSchema),
  },
  responses: {
    201: jsonContent(messageSchema, "Shared message created"),
    403: jsonContent(errorSchema, "Channel is archived or user not a member of source channel"),
    404: jsonContent(errorSchema, "Source message not found"),
  },
});

const saveMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages/:messageId/save",
  tags: ["Saved Messages"],
  summary: "Save message",
  description: "Saves a message for later reference. Private to the current user.",
  security: BEARER_SECURITY,
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: jsonContent(okSchema, "Message saved"),
    404: jsonContent(errorSchema, "Message not found"),
  },
});

const unsaveMessageRoute = createRoute({
  method: "delete",
  path: "/:id/messages/:messageId/save",
  tags: ["Saved Messages"],
  summary: "Unsave message",
  description: "Removes a message from saved items.",
  security: BEARER_SECURITY,
  middleware: [rlPin, resolveChannel, requireChannelMember] as const,
  request: { params: messageIdParam },
  responses: {
    200: jsonContent(okSchema, "Message unsaved"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getMessagesRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const { cursor, limit, direction } = c.req.valid("query");
    const result = await getMessages(channel.id, cursor, limit, direction);
    return jsonResponse(c, result, 200);
  })
  .openapi(createMessageRoute, async (c) => {
    const { user, channel, tokenMeta } = getChannelContext(c);

    if (channel.isArchived) {
      throw new ForbiddenError("Channel is archived");
    }

    const { content, attachmentIds, actions } = c.req.valid("json");

    const message = await createMessage(channel.id, user.id, content, attachmentIds);
    if ("error" in message) {
      throw new BadRequestError(message.error);
    }

    // Handle bot message actions
    if (tokenMeta.isBot && actions && actions.length > 0 && tokenMeta.botAppId) {
      await setMessageActions(message.id, tokenMeta.botAppId, actions);
    }

    const emitMessage = tokenMeta.isBot && tokenMeta.botAppId
      ? { ...message, isBot: true as const, botAppId: tokenMeta.botAppId, actions: actions ?? [] } as BotMessage
      : message;

    emitToChannel(channel.id, "message:new", emitMessage);
    webhookDispatcher.dispatch({
      type: "message:new",
      channelId: channel.id,
      workspaceId: c.get("workspace").id,
      data: emitMessage,
      ...(tokenMeta.isBot ? { excludeBotUserId: user.id } : {}),
    });
    unfurlMessageLinks(message.id, channel.id, content).catch(console.error);
    scheduleMessagePush(emitMessage, c.get("workspace").slug).catch(console.error);
    return jsonResponse(c, emitMessage, 201);
  })
  .openapi(getMessagesAroundRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const messageId = c.req.valid("param").messageId;
    const result = await getMessagesAround(channel.id, messageId);
    if (!result.targetFound) {
      throw new NotFoundError("Message");
    }
    return jsonResponse(c, result, 200);
  })
  .openapi(getThreadRepliesRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const messageId = c.req.valid("param").messageId;
    const { cursor, limit, direction } = c.req.valid("query");
    const result = await getThreadReplies(messageId, channel.id, cursor, limit, direction);
    return jsonResponse(c, result, 200);
  })
  .openapi(createThreadReplyRoute, async (c) => {
    const { user, channel } = getChannelContext(c);

    if (channel.isArchived) {
      throw new ForbiddenError("Channel is archived");
    }

    const messageId = c.req.valid("param").messageId;
    const { content, attachmentIds } = c.req.valid("json");

    const result = await createThreadReply(messageId, channel.id, user.id, content, attachmentIds);

    if ("error" in result) {
      if (result.error === "Cannot reply to a reply" || result.error === "One or more attachments are invalid or already linked") {
        throw new BadRequestError(result.error);
      }
      throw new NotFoundError("Parent message");
    }

    emitToChannel(channel.id, "message:new", result.reply);
    emitToChannel(channel.id, "thread:updated", result.threadUpdate);
    webhookDispatcher.dispatch({ type: "message:new", channelId: channel.id, workspaceId: c.get("workspace").id, data: result.reply });
    unfurlMessageLinks(result.reply.id, channel.id, content).catch(console.error);
    scheduleMessagePush(result.reply, c.get("workspace").slug).catch(console.error);

    return jsonResponse(c, result.reply, 201);
  })
  .openapi(pinMessageRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    const messageId = c.req.valid("param").messageId;

    const result = await pinMessage(channel.id, messageId, user.id);
    if (!result) {
      throw new NotFoundError("Message");
    }

    emitToChannel(channel.id, "message:pinned", {
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
    const { channel } = getChannelContext(c);
    const messageId = c.req.valid("param").messageId;

    await unpinMessage(channel.id, messageId);

    emitToChannel(channel.id, "message:unpinned", {
      messageId,
      channelId: channel.id,
    });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(pinCountRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const count = await getPinnedCount(channel.id);
    return jsonResponse(c, { count }, 200);
  })
  .openapi(listPinsRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const pinnedIds = await getPinnedMessageIds(channel.id);

    const msgs = await getMessagesByIds(pinnedIds);
    // Reorder to match pin order (pinnedIds is already ordered by pinnedAt DESC)
    const msgMap = new Map(msgs.map((m) => [m.id, m]));
    const validMessages = pinnedIds.map((id) => msgMap.get(id)).filter((m): m is NonNullable<typeof m> => m !== undefined);

    return jsonResponse(c, { messages: validMessages }, 200);
  })
  .openapi(shareMessageRoute, async (c) => {
    const { user, channel } = getChannelContext(c);

    if (channel.isArchived) {
      throw new ForbiddenError("Channel is archived");
    }

    const { sharedMessageId, comment } = c.req.valid("json");

    // Verify source message exists
    const sourceMessage = await getMessageById(asMessageId(sharedMessageId));
    if (!sourceMessage) {
      throw new NotFoundError("Source message");
    }

    // Verify user is a member of source channel
    const isMember = await isChannelMember(sourceMessage.channelId, user.id);
    if (!isMember) {
      throw new ForbiddenError("Not a member of source channel");
    }

    const message = await createSharedMessage(
      channel.id,
      user.id,
      asMessageId(sharedMessageId),
      comment,
    );

    emitToChannel(channel.id, "message:new", message);

    return jsonResponse(c, message, 201);
  })
  .openapi(saveMessageRoute, async (c) => {
    const { user } = getChannelContext(c);
    const messageId = c.req.valid("param").messageId;

    const result = await saveMessage(user.id, messageId);
    if (!result) {
      throw new NotFoundError("Message");
    }

    return c.json({ ok: true as const }, 200);
  })
  .openapi(unsaveMessageRoute, async (c) => {
    const { user } = getChannelContext(c);
    const messageId = c.req.valid("param").messageId;

    await unsaveMessage(user.id, messageId);

    return c.json({ ok: true as const }, 200);
  });

export default app;
