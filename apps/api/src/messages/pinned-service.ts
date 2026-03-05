import { eq, and, inArray, desc, count } from "drizzle-orm";
import { db } from "../db";
import { pinnedMessages } from "./pinned-schema";
import { messages } from "./schema";
import type { ChannelId, MessageId, UserId } from "@openslaq/shared";

export async function pinMessage(
  channelId: ChannelId,
  messageId: MessageId,
  pinnedBy: UserId,
): Promise<{ pinnedAt: Date } | null> {
  // Verify message exists in channel
  const msg = await db.query.messages.findFirst({
    where: and(eq(messages.id, messageId), eq(messages.channelId, channelId)),
  });
  if (!msg) return null;

  await db
    .insert(pinnedMessages)
    .values({ channelId, messageId, pinnedBy })
    .onConflictDoNothing();

  const row = await db.query.pinnedMessages.findFirst({
    where: and(
      eq(pinnedMessages.channelId, channelId),
      eq(pinnedMessages.messageId, messageId),
    ),
  });

  return { pinnedAt: row!.pinnedAt };
}

export async function unpinMessage(
  channelId: ChannelId,
  messageId: MessageId,
): Promise<boolean> {
  const result = await db
    .delete(pinnedMessages)
    .where(
      and(
        eq(pinnedMessages.channelId, channelId),
        eq(pinnedMessages.messageId, messageId),
      ),
    )
    .returning();
  return result.length > 0;
}

export async function getPinnedMessageIds(channelId: ChannelId): Promise<MessageId[]> {
  const rows = await db
    .select({ messageId: pinnedMessages.messageId })
    .from(pinnedMessages)
    .where(eq(pinnedMessages.channelId, channelId))
    .orderBy(desc(pinnedMessages.pinnedAt));
  return rows.map((r) => r.messageId as MessageId);
}

export async function getPinnedCount(channelId: ChannelId): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(pinnedMessages)
    .where(eq(pinnedMessages.channelId, channelId));
  return row?.count ?? 0;
}

export async function batchPinStatus(
  messageIds: string[],
): Promise<Map<string, { pinnedBy: string; pinnedAt: Date }>> {
  if (messageIds.length === 0) return new Map();

  const rows = await db
    .select({
      messageId: pinnedMessages.messageId,
      pinnedBy: pinnedMessages.pinnedBy,
      pinnedAt: pinnedMessages.pinnedAt,
    })
    .from(pinnedMessages)
    .where(inArray(pinnedMessages.messageId, messageIds));

  const map = new Map<string, { pinnedBy: string; pinnedAt: Date }>();
  for (const row of rows) {
    map.set(row.messageId, { pinnedBy: row.pinnedBy, pinnedAt: row.pinnedAt });
  }
  return map;
}
