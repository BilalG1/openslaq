import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { zMessageId } from "@openslaq/shared";
import { auth } from "../auth/middleware";
import { requireScope } from "../auth/scope-middleware";
import { editMessageSchema } from "./validation";
import { setMessageActions } from "../bots/service";
import type { BotMessage } from "@openslaq/shared";
import { editMessage, deleteMessage } from "./service";
import { reUnfurlMessageLinks } from "./link-preview-service";
import { requireMessageChannelAccess } from "./middleware";
import { emitToChannel } from "../lib/emit";
import { rlMessageSend, rlRead } from "../rate-limit";
import { messageSchema, errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { webhookDispatcher } from "../bots/webhook-dispatcher";
import { captureException } from "../sentry";
import { NotFoundError } from "../errors";
import { getMessageContext } from "../lib/context";

const getMessageRoute = createRoute({
  method: "get",
  path: "/messages/:id",
  tags: ["Messages"],
  summary: "Get single message",
  description: "Returns a single message by ID.",
  security: BEARER_SECURITY,
  middleware: [auth, rlRead, requireScope("chat:read"), requireMessageChannelAccess] as const,
  request: {
    params: z.object({ id: zMessageId() }),
  },
  responses: {
    200: jsonContent(messageSchema, "Message"),
    404: jsonContent(errorSchema, "Message not found"),
  },
});

const editMessageRoute = createRoute({
  method: "put",
  path: "/messages/:id",
  tags: ["Messages"],
  summary: "Edit message",
  description: "Edits a message. Only the message author can edit.",
  security: BEARER_SECURITY,
  middleware: [auth, rlMessageSend, requireScope("chat:write"), requireMessageChannelAccess] as const,
  request: {
    params: z.object({ id: zMessageId() }),
    body: jsonBody(editMessageSchema),
  },
  responses: {
    200: jsonContent(messageSchema, "Updated message"),
    404: jsonContent(errorSchema, "Message not found or not yours"),
  },
});

const deleteMessageRoute = createRoute({
  method: "delete",
  path: "/messages/:id",
  tags: ["Messages"],
  summary: "Delete message",
  description: "Deletes a message. Only the message author can delete.",
  security: BEARER_SECURITY,
  middleware: [auth, rlMessageSend, requireScope("chat:write"), requireMessageChannelAccess] as const,
  request: {
    params: z.object({ id: zMessageId() }),
  },
  responses: {
    200: jsonContent(okSchema, "Message deleted"),
    404: jsonContent(errorSchema, "Message not found or not yours"),
  },
});

const app = new OpenAPIHono()
  .openapi(getMessageRoute, async (c) => {
    const { message } = getMessageContext(c);
    return jsonResponse(c, message, 200);
  })
  .openapi(editMessageRoute, async (c) => {
    const { user, tokenMeta } = getMessageContext(c);
    const messageId = c.req.valid("param").id;
    const { content, actions } = c.req.valid("json");
    const updated = await editMessage(messageId, user.id, content);

    if (!updated) {
      throw new NotFoundError("Message");
    }

    // Handle bot message actions
    if (tokenMeta.isBot && actions !== undefined && tokenMeta.botAppId) {
      await setMessageActions(updated.id, tokenMeta.botAppId, actions);
    }

    const emitMessage = tokenMeta.isBot && tokenMeta.botAppId
      ? { ...updated, isBot: true as const, botAppId: tokenMeta.botAppId, actions: actions ?? [] } as BotMessage
      : updated;

    emitToChannel(updated.channelId, "message:updated", emitMessage);
    webhookDispatcher.dispatchForChannel({ type: "message:updated", channelId: updated.channelId, data: emitMessage });
    reUnfurlMessageLinks(updated.id, updated.channelId, content).catch((err) =>
      captureException(err, { userId: user.id, channelId: updated.channelId, op: "message:re-unfurl" }),
    );

    return jsonResponse(c, emitMessage, 200);
  })
  .openapi(deleteMessageRoute, async (c) => {
    const { user } = getMessageContext(c);
    const messageId = c.req.valid("param").id;
    const deleted = await deleteMessage(messageId, user.id);

    if (!deleted) {
      throw new NotFoundError("Message");
    }

    emitToChannel(deleted.channelId, "message:deleted", { id: deleted.id, channelId: deleted.channelId });
    webhookDispatcher.dispatchForChannel({ type: "message:deleted", channelId: deleted.channelId, data: { id: deleted.id, channelId: deleted.channelId } });

    return c.json({ ok: true as const }, 200);
  });

export default app;
