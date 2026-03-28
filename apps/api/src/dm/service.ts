import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { channels, channelMembers } from "../channels/schema";
import { messages } from "../messages/schema";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import type { Channel, WorkspaceId, UserId } from "@openslaq/shared";
import { asChannelId, asUserId, CHANNEL_TYPES } from "@openslaq/shared";
import { toChannel } from "../channels/to-channel";
import { initializeReadPositions } from "../channels/read-positions-service";

interface DmUser {
  id: UserId;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface DmResult {
  channel: Channel;
  otherUser: DmUser | null;
  created: boolean;
}

export interface DmListItem {
  channel: Channel;
  otherUser: DmUser;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
}

export function dmChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

export async function getOrCreateDm(
  workspaceId: WorkspaceId,
  currentUserId: UserId,
  targetUserId: UserId,
): Promise<DmResult | null> {
  // Verify target user is a workspace member
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, targetUserId),
    ),
  });
  if (!membership) return null;

  const name = dmChannelName(currentUserId, targetUserId);

  // Check for existing DM channel
  const existing = await db.query.channels.findFirst({
    where: and(
      eq(channels.workspaceId, workspaceId),
      eq(channels.name, name),
      eq(channels.type, CHANNEL_TYPES.DM),
    ),
  });

  if (existing) {
    const otherUser = await getOtherUser(targetUserId);
    return { channel: toChannel(existing), otherUser, created: false };
  }

  // Create new DM channel
  const [channel] = await db
    .insert(channels)
    .values({
      workspaceId,
      name,
      type: CHANNEL_TYPES.DM,
      createdBy: currentUserId,
    })
    .returning();

  if (!channel) throw new Error("Failed to create DM channel");

  // Add both users as members
  const memberValues = [
    { channelId: channel.id, userId: currentUserId as string },
  ];
  if (targetUserId !== currentUserId) {
    memberValues.push({ channelId: channel.id, userId: targetUserId as string });
  }
  await db.insert(channelMembers).values(memberValues);
  await initializeReadPositions(asChannelId(channel.id), memberValues.map((v) => asUserId(v.userId)));

  const otherUser = await getOtherUser(targetUserId);
  return { channel: toChannel(channel), otherUser, created: true };
}

export async function listDms(workspaceId: WorkspaceId, userId: UserId): Promise<DmListItem[]> {
  // Subquery: DM channel IDs where this user is a member
  const userDmChannelIds = db
    .select({ channelId: channelMembers.channelId })
    .from(channelMembers)
    .innerJoin(channels, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channelMembers.userId, userId),
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, CHANNEL_TYPES.DM),
      ),
    );

  // Fetch those channels and all their members in one query
  const rows = await db
    .select({
      channel: channels,
      memberId: channelMembers.userId,
    })
    .from(channels)
    .innerJoin(channelMembers, eq(channels.id, channelMembers.channelId))
    .where(inArray(channels.id, userDmChannelIds));

  // Group by channel
  const channelMap = new Map<
    string,
    { channel: typeof rows[0]["channel"]; memberIds: string[] }
  >();
  for (const row of rows) {
    const entry = channelMap.get(row.channel.id);
    if (entry) {
      entry.memberIds.push(row.memberId);
    } else {
      channelMap.set(row.channel.id, {
        channel: row.channel,
        memberIds: [row.memberId],
      });
    }
  }

  // Collect all "other" user IDs to batch-fetch
  const otherUserIds = new Set<string>();
  for (const { memberIds } of channelMap.values()) {
    const otherUserId = memberIds.find((id) => id !== userId) ?? (userId as string);
    otherUserIds.add(otherUserId);
  }

  // Batch-fetch all users in a single query
  const userRows = otherUserIds.size > 0
    ? await db.query.users.findMany({
        where: inArray(users.id, [...otherUserIds]),
        columns: { id: true, displayName: true, email: true, avatarUrl: true },
      })
    : [];

  const userMap = new Map<string, DmUser>();
  for (const u of userRows) {
    userMap.set(u.id, {
      id: asUserId(u.id),
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl,
    });
  }

  // Batch-fetch latest message per DM channel using a lateral join
  const channelIds = [...channelMap.keys()];
  const lastMessageMap = new Map<string, { content: string; createdAt: Date }>();
  if (channelIds.length > 0) {
    const lastMessages = await db
      .select({
        channelId: messages.channelId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.channelId, channelIds),
          sql`${messages.parentMessageId} IS NULL`,
        ),
      )
      .orderBy(desc(messages.createdAt));

    // Keep only the first (latest) message per channel
    for (const row of lastMessages) {
      if (!lastMessageMap.has(row.channelId)) {
        lastMessageMap.set(row.channelId, { content: row.content, createdAt: row.createdAt });
      }
    }
  }

  const results: DmListItem[] = [];

  for (const { channel, memberIds } of channelMap.values()) {
    const otherUserId = memberIds.find((id) => id !== userId) ?? (userId as string);
    const otherUser = userMap.get(otherUserId);
    if (otherUser) {
      const lastMsg = lastMessageMap.get(channel.id);
      results.push({
        channel: toChannel(channel),
        otherUser,
        lastMessageContent: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt.toISOString() ?? null,
      });
    }
  }

  return results;
}

async function getOtherUser(userId: string): Promise<DmUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
    },
  });
  if (!user) return null;
  return {
    id: asUserId(user.id),
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}
