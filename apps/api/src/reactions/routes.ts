import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { zMessageId } from "@openslaq/shared";
import { auth } from "../auth/middleware";
import { requireMessageChannelAccess } from "../messages/middleware";
import { toggleReaction } from "./service";
import { getIO } from "../socket/io";
import { rlReaction } from "../rate-limit";
import { reactionsResponseSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { webhookDispatcher } from "../bots/webhook-dispatcher";

const toggleReactionRoute = createRoute({
  method: "post",
  path: "/messages/:id/reactions",
  tags: ["Reactions"],
  summary: "Toggle emoji reaction",
  description: "Adds or removes an emoji reaction on a message.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlReaction, requireMessageChannelAccess] as const,
  request: {
    params: z.object({ id: zMessageId() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            emoji: z.string().min(1).max(32).describe("Emoji character"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: reactionsResponseSchema } },
      description: "Updated reactions",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found",
    },
  },
});

const app = new OpenAPIHono().openapi(toggleReactionRoute, async (c) => {
  const user = c.get("user");
  const messageId = c.req.valid("param").id;
  const { emoji } = c.req.valid("json");

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
  webhookDispatcher.dispatchForChannel({
    type: "reaction:updated",
    channelId: result.channelId,
    data: { messageId, channelId: result.channelId, reactions: result.reactions },
  });

  return jsonResponse(c, { reactions: result.reactions }, 200);
});

export default app;
