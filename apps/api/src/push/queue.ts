import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { Message, UserId } from "@openslaq/shared";
import { db } from "../db";
import { pushQueue } from "./schema";
import { deliverPush } from "./service";
import { isApnsConfigured } from "./apns";

const POLL_INTERVAL_MS = 1000;
const PUSH_DELAY_MS = 3000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let processing = false;

export async function schedulePush(
  messageId: string,
  userId: string,
  channelId: string,
  workspaceSlug: string,
): Promise<void> {
  const deliverAfter = new Date(Date.now() + PUSH_DELAY_MS);

  await db
    .insert(pushQueue)
    .values({ messageId, userId, channelId, workspaceSlug, deliverAfter })
    .onConflictDoNothing();
}

export async function cancelPushesForUser(
  userId: string,
  channelId: string,
): Promise<void> {
  await db
    .delete(pushQueue)
    .where(
      and(eq(pushQueue.userId, userId), eq(pushQueue.channelId, channelId)),
    );
}

export async function pendingCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pushQueue);
  return row?.count ?? 0;
}

export async function processDueItems(): Promise<void> {
  if (processing) return;
  processing = true;

  try {
    const now = new Date();
    const dueItems = await db
      .select()
      .from(pushQueue)
      .where(lte(pushQueue.deliverAfter, now))
      .limit(100);

    if (dueItems.length === 0) return;

    // Delete all due items in one batch
    const dueIds = dueItems.map((item) => item.id);
    await db.delete(pushQueue).where(inArray(pushQueue.id, dueIds));

    // Deliver pushes concurrently
    await Promise.allSettled(
      dueItems.map(async (item) => {
        try {
          // Fetch the message for deliverPush
          const { messages } = await import("../messages/schema");
          const { users } = await import("../users/schema");
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
            .where(eq(messages.id, item.messageId))
            .limit(1);

          if (!row) return;

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

          await deliverPush(message as unknown as Message, item.userId as UserId, item.workspaceSlug);
        } catch (err) {
          console.error("[push-queue] delivery failed:", err);
        }
      }),
    );
  } finally {
    processing = false;
  }
}

export function startPushQueuePoller(): void {
  if (pollTimer) return;
  if (!isApnsConfigured()) return;

  pollTimer = setInterval(() => {
    processDueItems().catch((err) =>
      console.error("[push-queue] poll error:", err),
    );
  }, POLL_INTERVAL_MS);
}

export function stopPushQueuePoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
