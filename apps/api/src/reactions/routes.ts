import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { zMessageId } from "@openslaq/shared";
import { auth } from "../auth/middleware";
import { requireScope } from "../auth/scope-middleware";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { requireMessageChannelAccess } from "../messages/middleware";
import { toggleReaction } from "./service";
import { emitToChannel } from "../lib/emit";
import { rlReaction } from "../rate-limit";
import { reactionsResponseSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { webhookDispatcher } from "../bots/webhook-dispatcher";
import { NotFoundError } from "../errors";

const toggleReactionRoute = createRoute({
  method: "post",
  path: "/messages/:id/reactions",
  tags: ["Reactions"],
  summary: "Toggle emoji reaction",
  description: "Adds or removes an emoji reaction on a message.",
  security: BEARER_SECURITY,
  middleware: [auth, rlReaction, requireScope("reactions:write"), requireMessageChannelAccess] as const,
  request: {
    params: z.object({ id: zMessageId() }),
    body: jsonBody(z.object({
      emoji: z.string().min(1).max(32).describe("Emoji character"),
    })),
  },
  responses: {
    200: jsonContent(reactionsResponseSchema, "Updated reactions"),
    404: jsonContent(errorSchema, "Message not found"),
  },
});

const app = new OpenAPIHono().openapi(toggleReactionRoute, async (c) => {
  const user = c.get("user");
  const messageId = c.req.valid("param").id;
  const { emoji } = c.req.valid("json");

  const result = await toggleReaction(messageId, user.id, emoji);

  if (!result) {
    throw new NotFoundError("Message");
  }

  emitToChannel(result.channelId, "reaction:updated", {
    messageId,
    channelId: result.channelId,
    reactions: result.reactions,
  });
  webhookDispatcher.dispatchForChannel({
    type: "reaction:updated",
    channelId: result.channelId,
    data: { messageId, channelId: result.channelId, reactions: result.reactions },
  });

  return jsonResponse(c, { reactions: result.reactions }, 200);
});

export default app;
