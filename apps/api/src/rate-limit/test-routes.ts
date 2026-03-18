import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { resetStore, setEnabled } from "./store";
import { db } from "../db";
import { webhookDeliveries } from "../bots/schema";
import {
  setApnsSender,
  resetApnsSender,
  getApnsSentLog,
  clearApnsSentLog,
} from "../push/apns";
import type { ApnsResult } from "../push/apns";
import { deliverPush } from "../push/service";
import { pendingCount } from "../push/queue";
import { messages } from "../messages/schema";
import { users } from "../users/schema";

const requireTestSecret = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${env.E2E_TEST_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

const app = new Hono()
  // Public test endpoints (no auth required — used as webhook targets)
  .post("/webhook-echo-update", (c) => {
    return c.json({
      updateMessage: {
        content: "Updated by webhook",
        actions: [{ id: "done", type: "button", label: "Done", style: "primary" }],
      },
    });
  })
  .post("/webhook-echo-text", (c) => {
    return c.json({ text: "Bot response from webhook" });
  })
  // Protected test endpoints
  .use(requireTestSecret)
  .post("/reset-rate-limits", async (c) => {
    await resetStore();
    setEnabled(true);
    return c.json({ ok: true });
  })
  .post("/disable-rate-limits", async (c) => {
    await resetStore();
    setEnabled(false);
    return c.json({ ok: true });
  })
  .get("/webhook-deliveries/:botAppId", async (c) => {
    const botAppId = c.req.param("botAppId");
    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.botAppId, botAppId));
    return c.json(rows);
  })
  // Push notification test endpoints
  .post("/push/enable-fake", (c) => {
    let fakeResponse: ApnsResult = { success: true, statusCode: 200 };
    setApnsSender(async (_token, _payload) => fakeResponse);
    // Store setter so /push/set-fake-response can update it
    (globalThis as any).__fakeApnsResponseSetter = (r: ApnsResult) => {
      fakeResponse = r;
      setApnsSender(async (_token, _payload) => fakeResponse);
    };
    return c.json({ ok: true });
  })
  .post("/push/disable-fake", (c) => {
    resetApnsSender();
    delete (globalThis as any).__fakeApnsResponseSetter;
    return c.json({ ok: true });
  })
  .get("/push/sent", (c) => {
    return c.json(getApnsSentLog());
  })
  .post("/push/clear", (c) => {
    clearApnsSentLog();
    return c.json({ ok: true });
  })
  .post("/push/deliver-now", async (c) => {
    const { messageId, userId, workspaceSlug } = await c.req.json<{
      messageId: string;
      userId: string;
      workspaceSlug: string;
    }>();
    // Fetch the message from DB + sender display name
    const [row] = await db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        userId: messages.userId,
        content: messages.content,
        type: messages.type,
        parentMessageId: messages.parentMessageId,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        displayName: users.displayName,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.id, messageId))
      .limit(1);
    if (!row) return c.json({ error: "Message not found" }, 404);

    // Build minimal Message object for deliverPush
    const message = {
      id: row.id,
      channelId: row.channelId,
      userId: row.userId,
      content: row.content,
      type: row.type,
      parentMessageId: row.parentMessageId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
      senderDisplayName: row.displayName,
      senderAvatarUrl: null,
      mentions: (row.metadata as any)?.mentions ?? null,
      attachments: null,
      reactions: {},
      replyCount: 0,
      latestReplyAt: null,
      isPinned: false,
      pinnedAt: null,
      pinnedBy: null,
      actions: null,
      botAppId: null,
    };
    await deliverPush(message as any, userId as any, workspaceSlug);
    return c.json({ ok: true });
  })
  .get("/push/pending-count", (c) => {
    return c.json({ count: pendingCount() });
  })
  .post("/push/set-fake-response", async (c) => {
    const response = await c.req.json<ApnsResult>();
    const setter = (globalThis as any).__fakeApnsResponseSetter;
    if (setter) setter(response);
    return c.json({ ok: true });
  });

export default app;
