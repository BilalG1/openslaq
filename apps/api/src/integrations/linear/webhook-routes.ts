import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env";
import { getSubscriptionsForTeam, getLinearBotForWorkspace } from "./service";
import { handleLinearEvent } from "./event-handlers";
import { createMessage } from "../../messages/service";
import { setMessageActions } from "../../bots/service";
import { getIO } from "../../socket/io";
import { asChannelId, asUserId } from "@openslaq/shared";

const app = new Hono();

app.post("/webhook", async (c) => {
  const body = await c.req.text();

  // Require webhook secret — reject all requests if not configured
  if (!env.LINEAR_WEBHOOK_SECRET) {
    return c.json({ error: "Linear webhook signature verification is not configured" }, 503);
  }

  const signature = c.req.header("Linear-Signature");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  // Linear sends raw hex (no prefix)
  const expected = createHmac("sha256", env.LINEAR_WEBHOOK_SECRET).update(body).digest("hex");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const payload = JSON.parse(body) as Record<string, unknown>;

  // Process in background
  processWebhook(payload).catch((err) => {
    console.error("[linear] Webhook processing error:", err);
  });

  return c.json({ ok: true });
});

async function processWebhook(
  payload: Record<string, unknown>,
): Promise<void> {
  // Extract team ID from the payload data
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return;

  // Team can be directly on data, or on data.issue (for comments), or on data.team
  let teamId: string | undefined;
  const team = data.team as { id?: string } | undefined;
  if (team?.id) {
    teamId = team.id;
  } else {
    // For comments, team is on the issue
    const issue = data.issue as Record<string, unknown> | undefined;
    const issueTeam = issue?.team as { id?: string } | undefined;
    if (issueTeam?.id) {
      teamId = issueTeam.id;
    }
  }

  if (!teamId) return;

  const subscriptions = await getSubscriptionsForTeam(teamId);
  if (subscriptions.length === 0) return;

  for (const sub of subscriptions) {
    const formatted = handleLinearEvent(payload, sub.enabledEvents);
    if (!formatted) continue;

    const bot = await getLinearBotForWorkspace(sub.workspaceId);
    if (!bot) continue;

    const result = await createMessage(
      asChannelId(sub.channelId),
      asUserId(bot.userId),
      formatted.content,
    );

    if ("error" in result) {
      console.error(`[linear] Failed to create message in channel ${sub.channelId}:`, result.error);
      continue;
    }

    if (formatted.actions.length > 0) {
      await setMessageActions(result.id, bot.botAppId, formatted.actions.map((a) => ({
        id: crypto.randomUUID(),
        type: "button" as const,
        label: a.label,
        value: a.url,
        style: a.style ?? "default",
      })));
    }

    try {
      getIO().to(`channel:${sub.channelId}`).emit("message:new", result);
    } catch {
      // Socket.IO may not be initialized
    }
  }
}

export default app;
