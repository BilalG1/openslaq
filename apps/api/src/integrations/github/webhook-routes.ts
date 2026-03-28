import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env";
import { ServiceUnavailableError, UnauthorizedError, BadRequestError } from "../../errors";
import { getSubscriptionsForRepo, getGithubBotForWorkspace } from "./service";
import { handleGithubEvent } from "./event-handlers";
import { createMessage } from "../../messages/service";
import { setMessageActions } from "../../bots/service";
import { emitToChannel } from "../../lib/emit";
import { asChannelId, asUserId } from "@openslaq/shared";

const app = new Hono();

app.post("/webhook", async (c) => {
  const body = await c.req.text();

  // Require webhook secret — reject all requests if not configured
  if (!env.GITHUB_WEBHOOK_SECRET) {
    throw new ServiceUnavailableError("GitHub webhook signature verification is not configured");
  }

  const signature = c.req.header("X-Hub-Signature-256");
  if (!signature) {
    throw new UnauthorizedError("Missing signature");
  }

  const expected = `sha256=${createHmac("sha256", env.GITHUB_WEBHOOK_SECRET).update(body).digest("hex")}`;
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new UnauthorizedError("Invalid signature");
  }

  const eventType = c.req.header("X-GitHub-Event");
  if (!eventType) {
    throw new BadRequestError("Missing X-GitHub-Event header");
  }

  // Respond immediately, process async
  const payload = JSON.parse(body) as Record<string, unknown>;

  // Handle ping event
  if (eventType === "ping") {
    return c.json({ ok: true });
  }

  // Process in background
  processWebhook(eventType, payload).catch((err) => {
    console.error("[github] Webhook processing error:", err);
  });

  return c.json({ ok: true });
});

async function processWebhook(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const repoFullName = (payload.repository as { full_name?: string })?.full_name;
  if (!repoFullName) return;

  const subscriptions = await getSubscriptionsForRepo(repoFullName);
  if (subscriptions.length === 0) return;

  for (const sub of subscriptions) {
    const formatted = handleGithubEvent(eventType, payload, sub.enabledEvents);
    if (!formatted) continue;

    const bot = await getGithubBotForWorkspace(sub.workspaceId);
    if (!bot) continue;

    const result = await createMessage(
      asChannelId(sub.channelId),
      asUserId(bot.userId),
      formatted.content,
    );

    if ("error" in result) {
      console.error(`[github] Failed to create message in channel ${sub.channelId}:`, result.error);
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
      emitToChannel(asChannelId(sub.channelId), "message:new", result);
    } catch {
      // Socket.IO may not be initialized
    }
  }
}

export default app;
