import { eq, and, gt, ne, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { channelMembers } from "./schema";
import { channelReadPositions } from "./read-positions-schema";
import { messages } from "../messages/schema";
import type { UserId, ChannelId, MessageId, WorkspaceId } from "@openslaq/shared";
import { onReadPositionUpdated } from "../push/service";

export async function getUnreadCounts(userId: UserId): Promise<Record<string, number>> {
  const rows = await db
    .select({
      channelId: channelMembers.channelId,
      count: sql<number>`count(${messages.id})::int`,
    })
    .from(channelMembers)
    .leftJoin(
      channelReadPositions,
      and(
        eq(channelReadPositions.channelId, channelMembers.channelId),
        eq(channelReadPositions.userId, channelMembers.userId),
      ),
    )
    .innerJoin(
      messages,
      and(
        eq(messages.channelId, channelMembers.channelId),
        isNull(messages.parentMessageId),
        ne(messages.userId, userId),
        gt(messages.createdAt, sql`coalesce(${channelReadPositions.lastReadAt}, '1970-01-01')`),
      ),
    )
    .where(eq(channelMembers.userId, userId))
    .groupBy(channelMembers.channelId)
    .having(sql`count(${messages.id}) > 0`);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.channelId] = row.count;
  }
  return counts;
}

export async function markChannelAsRead(userId: UserId, channelId: ChannelId): Promise<void> {
  await db
    .insert(channelReadPositions)
    .values({ userId, channelId, lastReadAt: sql`now()` })
    .onConflictDoUpdate({
      target: [channelReadPositions.userId, channelReadPositions.channelId],
      set: { lastReadAt: sql`now()` },
    });
  onReadPositionUpdated(userId, channelId);
}

export async function markChannelAsUnread(
  userId: UserId,
  channelId: ChannelId,
  messageId: MessageId,
): Promise<{ unreadCount: number } | null> {
  // Find the message in the given channel
  const [message] = await db
    .select({ createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)))
    .limit(1);

  if (!message) return null;

  // Set lastReadAt to 1ms before the message's createdAt
  const beforeTs = new Date(message.createdAt.getTime() - 1);

  await db
    .insert(channelReadPositions)
    .values({ userId, channelId, lastReadAt: beforeTs })
    .onConflictDoUpdate({
      target: [channelReadPositions.userId, channelReadPositions.channelId],
      set: { lastReadAt: beforeTs },
    });

  // Count unread messages (top-level only, after the new read position)
  const [result] = await db
    .select({ count: sql<number>`count(${messages.id})::int` })
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        isNull(messages.parentMessageId),
        gt(messages.createdAt, beforeTs),
      ),
    );

  return { unreadCount: result?.count ?? 0 };
}

export async function markAllChannelsAsRead(userId: UserId, workspaceId: WorkspaceId): Promise<void> {
  await db.execute(sql`
    INSERT INTO channel_read_positions (user_id, channel_id, last_read_at)
    SELECT ${userId}, cm.channel_id, now()
    FROM channel_members cm
    INNER JOIN channels c ON c.id = cm.channel_id
    WHERE cm.user_id = ${userId} AND c.workspace_id = ${workspaceId}
    ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = now()
  `);
}
