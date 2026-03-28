import { sql } from "drizzle-orm";
import { db } from "../db";
import { hydrateMessages } from "../messages/service";
import type { UserId, WorkspaceId, AllUnreadsResponse, UnreadChannelGroup, ChannelType } from "@openslaq/shared";
import { asChannelId } from "@openslaq/shared";

export async function getAllUnreads(userId: UserId, workspaceId: WorkspaceId): Promise<AllUnreadsResponse> {
  const [channelMessages, threadMentionMessages] = await Promise.all([
    fetchUnreadChannelMessages(userId, workspaceId),
    fetchUnreadThreadMentions(userId, workspaceId),
  ]);

  return {
    channels: channelMessages,
    threadMentions: threadMentionMessages,
  };
}

async function fetchUnreadChannelMessages(userId: UserId, workspaceId: WorkspaceId): Promise<UnreadChannelGroup[]> {
  // Fetch unread top-level messages across all channels the user is a member of,
  // excluding muted channels and own messages, capped at 10 per channel and 200 total.
  const rows = await db.execute<{
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    type: string | null;
    metadata: unknown;
    parent_message_id: string | null;
    shared_message_id: string | null;
    created_at: Date;
    updated_at: Date;
    channel_name: string;
    channel_type: string;
    rn: number;
  }>(sql`
    SELECT sub.* FROM (
      SELECT
        m.id, m.channel_id, m.user_id, m.content, m.type, m.metadata,
        m.parent_message_id, m.shared_message_id, m.created_at, m.updated_at,
        c.name AS channel_name, c.type AS channel_type,
        ROW_NUMBER() OVER (PARTITION BY m.channel_id ORDER BY m.created_at DESC) AS rn
      FROM messages m
      INNER JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ${userId}
      INNER JOIN channels c ON c.id = m.channel_id AND c.workspace_id = ${workspaceId}
      LEFT JOIN channel_read_positions crp ON crp.channel_id = m.channel_id AND crp.user_id = ${userId}
      LEFT JOIN channel_notification_prefs cnp ON cnp.channel_id = m.channel_id AND cnp.user_id = ${userId}
      WHERE m.parent_message_id IS NULL
        AND m.user_id != ${userId}
        AND m.created_at > COALESCE(crp.last_read_at, '1970-01-01')
        AND (cnp.level IS NULL OR cnp.level != 'muted')
    ) sub
    WHERE sub.rn <= 10
    ORDER BY sub.channel_id, sub.created_at ASC
    LIMIT 200
  `);

  if (rows.length === 0) return [];

  // Convert raw rows to DB message shape for hydration
  const dbRows = rows.map((r) => ({
    id: r.id,
    channelId: r.channel_id,
    userId: r.user_id,
    content: r.content,
    type: r.type,
    metadata: r.metadata,
    parentMessageId: r.parent_message_id,
    sharedMessageId: r.shared_message_id,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));

  const hydrated = await hydrateMessages(dbRows as Parameters<typeof hydrateMessages>[0]);

  // Group by channel
  const channelMap = new Map<string, UnreadChannelGroup>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const msg = hydrated[i]!;
    let group = channelMap.get(row.channel_id);
    if (!group) {
      group = {
        channelId: asChannelId(row.channel_id),
        channelName: row.channel_name,
        channelType: row.channel_type as ChannelType,
        messages: [],
      };
      channelMap.set(row.channel_id, group);
    }
    group.messages.push(msg);
  }

  return Array.from(channelMap.values());
}

async function fetchUnreadThreadMentions(userId: UserId, workspaceId: WorkspaceId) {
  // Fetch thread replies that @mention the user and are unread (after channel read position)
  const rows = await db.execute<{
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    type: string | null;
    metadata: unknown;
    parent_message_id: string | null;
    shared_message_id: string | null;
    created_at: Date;
    updated_at: Date;
  }>(sql`
    SELECT DISTINCT m.id, m.channel_id, m.user_id, m.content, m.type, m.metadata,
      m.parent_message_id, m.shared_message_id, m.created_at, m.updated_at
    FROM messages m
    INNER JOIN message_mentions mm ON mm.message_id = m.id AND mm.user_id = ${userId}
    INNER JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ${userId}
    INNER JOIN channels c ON c.id = m.channel_id AND c.workspace_id = ${workspaceId}
    LEFT JOIN channel_read_positions crp ON crp.channel_id = m.channel_id AND crp.user_id = ${userId}
    LEFT JOIN channel_notification_prefs cnp ON cnp.channel_id = m.channel_id AND cnp.user_id = ${userId}
    WHERE m.parent_message_id IS NOT NULL
      AND m.user_id != ${userId}
      AND m.created_at > COALESCE(crp.last_read_at, '1970-01-01')
      AND (cnp.level IS NULL OR cnp.level != 'muted')
    ORDER BY m.created_at DESC
    LIMIT 50
  `);

  if (rows.length === 0) return [];

  const dbRows = rows.map((r) => ({
    id: r.id,
    channelId: r.channel_id,
    userId: r.user_id,
    content: r.content,
    type: r.type,
    metadata: r.metadata,
    parentMessageId: r.parent_message_id,
    sharedMessageId: r.shared_message_id,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));

  return hydrateMessages(dbRows as Parameters<typeof hydrateMessages>[0], { skipThreadMeta: true });
}
