import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { savedMessages } from "./saved-schema";
import { messages } from "./schema";
import { channels } from "../channels/schema";
import { hydrateMessages } from "./service";
import type { Message, MessageId, UserId } from "@openslaq/shared";

export async function saveMessage(
  userId: UserId,
  messageId: MessageId,
): Promise<{ savedAt: Date } | null> {
  // Verify message exists
  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });
  if (!msg) return null;

  await db
    .insert(savedMessages)
    .values({ userId, messageId })
    .onConflictDoNothing();

  const row = await db.query.savedMessages.findFirst({
    where: and(
      eq(savedMessages.userId, userId),
      eq(savedMessages.messageId, messageId),
    ),
  });

  return { savedAt: row!.savedAt };
}

export async function unsaveMessage(
  userId: UserId,
  messageId: MessageId,
): Promise<boolean> {
  const result = await db
    .delete(savedMessages)
    .where(
      and(
        eq(savedMessages.userId, userId),
        eq(savedMessages.messageId, messageId),
      ),
    )
    .returning();
  return result.length > 0;
}

export async function getSavedMessageIds(userId: UserId): Promise<MessageId[]> {
  const rows = await db
    .select({ messageId: savedMessages.messageId })
    .from(savedMessages)
    .where(eq(savedMessages.userId, userId))
    .orderBy(desc(savedMessages.savedAt));
  return rows.map((r) => r.messageId as MessageId);
}

export async function getSavedMessages(
  userId: UserId,
  workspaceId: string,
): Promise<Array<{ message: Message; channelName: string; savedAt: string }>> {
  const rows = await db
    .select({
      messageId: savedMessages.messageId,
      savedAt: savedMessages.savedAt,
      channelName: channels.name,
    })
    .from(savedMessages)
    .innerJoin(messages, eq(savedMessages.messageId, messages.id))
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .where(
      and(
        eq(savedMessages.userId, userId),
        eq(channels.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(savedMessages.savedAt));

  if (rows.length === 0) return [];

  const messageIds = rows.map((r) => r.messageId);
  const messageRows = await db.query.messages.findMany({
    where: inArray(messages.id, messageIds),
  });
  const hydrated = await hydrateMessages(messageRows);
  const messageMap = new Map<string, Message>();
  for (const msg of hydrated) {
    messageMap.set(msg.id, msg);
  }

  return rows
    .filter((row) => messageMap.has(row.messageId))
    .map((row) => ({
      message: messageMap.get(row.messageId)!,
      channelName: row.channelName,
      savedAt: row.savedAt.toISOString(),
    }));
}
