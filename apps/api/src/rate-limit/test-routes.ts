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
  setRetryBaseMs,
  resetRetryBaseMs,
} from "../push/apns";
import type { ApnsResult } from "../push/apns";
import { deliverPush } from "../push/service";
import { pendingCount, schedulePush, cancelPushesForUser, processDueItems } from "../push/queue";
import { pushQueue } from "../push/schema";
import { messages } from "../messages/schema";
import { users } from "../users/schema";
import { processDueReminders } from "../commands/reminder-service";
import { reminders } from "../commands/reminder-schema";
import { cleanupStalePresence } from "../presence/service";
import { presenceConnections } from "../presence/schema";
import type { Message, UserId } from "@openslaq/shared";
import { UnauthorizedError, NotFoundError, AppError } from "../errors";

interface TestGlobals {
  __fakeApnsResponseSetter?: (r: ApnsResult) => void;
  __fakeApnsSequenceSetter?: (seq: ApnsResult[]) => void;
}

const testGlobals = globalThis as unknown as TestGlobals;

const requireTestSecret = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${env.E2E_TEST_SECRET}`) {
    throw new UnauthorizedError();
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
    let responseSequence: ApnsResult[] = [];
    setApnsSender(async (_token, _payload) => {
      if (responseSequence.length > 1) return responseSequence.shift()!;
      if (responseSequence.length === 1) return responseSequence[0]!;
      return fakeResponse;
    });
    // Store setters so other endpoints can update behavior
    testGlobals.__fakeApnsResponseSetter = (r: ApnsResult) => {
      fakeResponse = r;
      responseSequence = [];
    };
    testGlobals.__fakeApnsSequenceSetter = (seq: ApnsResult[]) => {
      responseSequence = seq;
    };
    return c.json({ ok: true });
  })
  .post("/push/disable-fake", (c) => {
    resetApnsSender();
    resetRetryBaseMs();
    delete testGlobals.__fakeApnsResponseSetter;
    delete testGlobals.__fakeApnsSequenceSetter;
    return c.json({ ok: true });
  })
  .post("/push/set-retry-base-ms", async (c) => {
    const { ms } = await c.req.json<{ ms: number }>();
    setRetryBaseMs(ms);
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
    if (!row) throw new NotFoundError("Message");

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
      mentions: (row.metadata as Record<string, unknown>)?.mentions ?? null,
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
    await deliverPush(message as unknown as Message, userId as UserId, workspaceSlug);
    return c.json({ ok: true });
  })
  .get("/push/pending-count", async (c) => {
    return c.json({ count: await pendingCount() });
  })
  .post("/push/set-fake-response", async (c) => {
    const response = await c.req.json<ApnsResult>();
    const setter = testGlobals.__fakeApnsResponseSetter;
    if (setter) setter(response);
    return c.json({ ok: true });
  })
  .post("/push/set-fake-response-sequence", async (c) => {
    const sequence = await c.req.json<ApnsResult[]>();
    const setter = testGlobals.__fakeApnsSequenceSetter;
    if (setter) setter(sequence);
    return c.json({ ok: true });
  })
  .post("/push/queue/schedule", async (c) => {
    const { messageId, userId, channelId, workspaceSlug } = await c.req.json<{
      messageId: string;
      userId: string;
      channelId: string;
      workspaceSlug: string;
    }>();
    await schedulePush(messageId, userId, channelId, workspaceSlug);
    return c.json({ ok: true });
  })
  .post("/push/queue/schedule-immediate", async (c) => {
    const { messageId, userId, channelId, workspaceSlug, deliverAfter } = await c.req.json<{
      messageId: string;
      userId: string;
      channelId: string;
      workspaceSlug: string;
      deliverAfter: string;
    }>();
    await db.insert(pushQueue).values({
      messageId,
      userId,
      channelId,
      workspaceSlug,
      deliverAfter: new Date(deliverAfter),
    }).onConflictDoNothing();
    return c.json({ ok: true });
  })
  .post("/push/queue/cancel", async (c) => {
    const { userId, channelId } = await c.req.json<{
      userId: string;
      channelId: string;
    }>();
    await cancelPushesForUser(userId, channelId);
    return c.json({ ok: true });
  })
  .post("/push/queue/clear", async (c) => {
    await db.delete(pushQueue);
    return c.json({ ok: true });
  })
  .get("/push/queue/items", async (c) => {
    const items = await db.select().from(pushQueue);
    return c.json(items);
  })
  .post("/push/queue/process", async (c) => {
    await processDueItems();
    return c.json({ ok: true });
  })
  .post("/reminders/insert", async (c) => {
    const { userId, channelId, text, remindAt } = await c.req.json<{
      userId: string;
      channelId: string;
      text: string;
      remindAt: string;
    }>();
    const [row] = await db
      .insert(reminders)
      .values({ userId, channelId, text, remindAt: new Date(remindAt) })
      .returning();
    return c.json(row);
  })
  .post("/reminders/process", async (c) => {
    await processDueReminders();
    return c.json({ ok: true });
  })
  .get("/reminders/:id", async (c) => {
    const [row] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, c.req.param("id")));
    if (!row) throw new AppError(404, "not found");
    return c.json(row);
  })
  .post("/presence/add-stale-socket", async (c) => {
    const { userId, socketId, lastHeartbeat } = await c.req.json<{
      userId: string;
      socketId: string;
      lastHeartbeat: string;
    }>();
    await db
      .insert(presenceConnections)
      .values({ userId, socketId, lastHeartbeat: new Date(lastHeartbeat) })
      .onConflictDoUpdate({
        target: [presenceConnections.userId, presenceConnections.socketId],
        set: { lastHeartbeat: new Date(lastHeartbeat) },
      });
    return c.json({ ok: true });
  })
  .get("/presence/connections", async (c) => {
    const userId = c.req.query("userId");
    const rows = userId
      ? await db.select().from(presenceConnections).where(eq(presenceConnections.userId, userId))
      : await db.select().from(presenceConnections);
    return c.json(rows);
  })
  .post("/presence/cleanup", async (c) => {
    await cleanupStalePresence();
    return c.json({ ok: true });
  });

export default app;
