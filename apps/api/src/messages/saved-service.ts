import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { savedMessages } from "./saved-schema";
import { messages } from "./schema";
import { channels } from "../channels/schema";
import { getMessageById } from "./service";
import type { MessageId, UserId } from "@openslaq/shared";

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
): Promise<Array<{ message: NonNullable<Awaited<ReturnType<typeof getMessageById>>>; channelName: string; savedAt: string }>> {
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

  const results = [];
  for (const row of rows) {
    const msg = await getMessageById(row.messageId as MessageId);
    if (msg) {
      results.push({
        message: msg,
        channelName: row.channelName,
        savedAt: row.savedAt.toISOString(),
      });
    }
  }
  return results;
}
