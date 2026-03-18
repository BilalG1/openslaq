import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env";
import { getSubscriptionsForProject, getSentryBotForWorkspace } from "./service";
import { handleSentryEvent } from "./event-handlers";
import { createMessage } from "../../messages/service";
import { setMessageActions } from "../../bots/service";
import { getIO } from "../../socket/io";
import { asChannelId, asUserId } from "@openslaq/shared";

const app = new Hono();

app.post("/webhook", async (c) => {
  const body = await c.req.text();

  // Require webhook secret — reject all requests if not configured
  if (!env.SENTRY_WEBHOOK_SECRET) {
    return c.json({ error: "Sentry webhook signature verification is not configured" }, 503);
  }

  const signature = c.req.header("sentry-hook-signature");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  // Sentry sends HMAC-SHA256 hex digest
  const expected = createHmac("sha256", env.SENTRY_WEBHOOK_SECRET).update(body).digest("hex");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const payload = JSON.parse(body) as Record<string, unknown>;

  // Process in background
  processWebhook(payload).catch((err) => {
    console.error("[sentry] Webhook processing error:", err);
  });

  return c.json({ ok: true });
});

async function processWebhook(
  payload: Record<string, unknown>,
): Promise<void> {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return;

  // Extract project ID from various event shapes
  let projectId: string | undefined;

  // Issue events: data.issue.project.id
  const issue = data.issue as Record<string, unknown> | undefined;
  if (issue) {
    const project = issue.project as { id?: string } | undefined;
    if (project?.id) {
      projectId = project.id;
    }
  }

  // Metric alert events: data.metric_alert.projects[0]
  if (!projectId) {
    const metricAlert = data.metric_alert as Record<string, unknown> | undefined;
    if (metricAlert) {
      const projects = metricAlert.projects as string[] | undefined;
      if (projects?.[0]) {
        projectId = projects[0];
      }
    }
  }

  // Event alert events: data.event.project_id or data.event.project
  if (!projectId) {
    const event = data.event as Record<string, unknown> | undefined;
    if (event) {
      projectId = (event.project_id as string) ?? (event.project as string) ?? undefined;
    }
  }

  // Deploy events: data.deploy.project
  if (!projectId) {
    const deploy = data.deploy as Record<string, unknown> | undefined;
    if (deploy) {
      projectId = deploy.project as string | undefined;
    }
  }

  if (!projectId) return;

  const subscriptions = await getSubscriptionsForProject(projectId);
  if (subscriptions.length === 0) return;

  for (const sub of subscriptions) {
    const formatted = handleSentryEvent(payload, sub.enabledEvents);
    if (!formatted) continue;

    const bot = await getSentryBotForWorkspace(sub.workspaceId);
    if (!bot) continue;

    const result = await createMessage(
      asChannelId(sub.channelId),
      asUserId(bot.userId),
      formatted.content,
    );

    if ("error" in result) {
      console.error(`[sentry] Failed to create message in channel ${sub.channelId}:`, result.error);
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
