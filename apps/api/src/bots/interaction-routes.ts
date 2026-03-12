import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { asMessageId, asChannelId, asUserId, asBotAppId, asWorkspaceId } from "@openslaq/shared";
import type { MessageActionButton, WebhookEventPayload } from "@openslaq/shared";
import { auth } from "../auth/middleware";
import type { AuthEnv } from "../auth/types";
import { db } from "../db";
import { messageActions } from "./schema";
import { botApps } from "./schema";
import { messages } from "../messages/schema";
import { isChannelMember } from "../channels/service";
import { editMessage, getMessageById } from "../messages/service";
import { setMessageActions } from "./service";
import { getIO } from "../socket/io";
import { rlBotSend } from "../rate-limit";
import { errorSchema, messageSchema } from "../openapi/schemas";
import { jsonOk } from "../openapi/responses";
import { validateWebhookUrl } from "./validate-url";

const interactionRoute = createRoute({
  method: "post",
  path: "/:messageId/actions/:actionId",
  tags: ["Bots"],
  summary: "Trigger bot action",
  description: "Handle a button click on a bot message. Sends interaction to bot webhook.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlBotSend] as const,
  request: {
    params: z.object({
      messageId: z.string().describe("Message ID"),
      actionId: z.string().describe("Action button ID"),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.literal(true), message: messageSchema.optional() }) } }, description: "Action processed" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message or action not found" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Not a channel member" },
  },
});

const app = new OpenAPIHono<AuthEnv>().openapi(interactionRoute, async (c) => {
  const user = c.get("user");
  const { messageId, actionId } = c.req.valid("param");

  // Look up message_actions
  const actionRow = await db.query.messageActions.findFirst({
    where: eq(messageActions.messageId, messageId),
  });

  if (!actionRow) {
    return c.json({ error: "No actions found for this message" }, 404);
  }

  const actionsArray = actionRow.actions as MessageActionButton[];
  const action = actionsArray.find((a) => a.id === actionId);
  if (!action) {
    return c.json({ error: "Action not found" }, 404);
  }

  // Get the message to verify channel membership
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });
  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }

  const isMember = await isChannelMember(asChannelId(message.channelId), user.id);
  if (!isMember) {
    return c.json({ error: "Not a channel member" }, 403);
  }

  // Get bot's webhook URL
  const bot = await db.query.botApps.findFirst({
    where: eq(botApps.id, actionRow.botAppId),
  });
  if (!bot || !bot.enabled) {
    return c.json({ error: "Bot not available" }, 404);
  }

  // Validate webhook URL before fetching
  const urlCheck = validateWebhookUrl(bot.webhookUrl);
  if (!urlCheck.ok) {
    return c.json({ error: "Bot webhook URL is invalid" }, 404);
  }

  // POST interaction to bot webhook
  const payload: WebhookEventPayload = {
    type: "interaction",
    interaction: {
      actionId,
      value: action.value,
      messageId: asMessageId(messageId),
      channelId: asChannelId(message.channelId),
      userId: asUserId(user.id),
      timestamp: new Date().toISOString(),
    },
    botAppId: asBotAppId(bot.id),
    workspaceId: asWorkspaceId(bot.workspaceId),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bot.apiToken) {
      const signature = createHmac("sha256", bot.apiToken).update(body).digest("hex");
      headers["X-OpenSlaq-Signature"] = `sha256=${signature}`;
    }

    const res = await fetch(bot.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const body = await res.json().catch(() => null);

      // Validate webhook response before trusting it
      const webhookResponseSchema = z.object({
        updateMessage: z.object({
          content: z.string().min(1).max(40000).optional(),
          actions: z.array(z.object({
            id: z.string(),
            type: z.literal("button"),
            label: z.string().max(80),
            style: z.enum(["primary", "danger", "default"]).optional(),
            value: z.string().optional(),
          })).optional(),
        }).optional(),
      });

      const parsed = webhookResponseSchema.safeParse(body);

      // If bot responds with updateMessage, update the message
      if (parsed.success && parsed.data.updateMessage) {
        const update = parsed.data.updateMessage;

        if (update.content) {
          // Direct update since the bot user owns the message
          await editMessage(asMessageId(messageId), asUserId(bot.userId), update.content);
        }

        if (update.actions !== undefined) {
          await setMessageActions(messageId, bot.id, update.actions);
        }

        // Re-fetch the full message and emit
        const updatedMessage = await getMessageById(asMessageId(messageId));
        if (updatedMessage) {
          const io = getIO();
          io.to(`channel:${message.channelId}`).emit("message:updated", updatedMessage);
        }

        return jsonOk(c, 200);
      }
    }

    return jsonOk(c, 200);
  } catch {
    // Bot webhook failed, but the interaction was still valid
    return jsonOk(c, 200);
  }
});

export default app;
