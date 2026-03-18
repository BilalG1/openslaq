import { eq, and, count, or, exists } from "drizzle-orm";
import { db } from "../db";
import { channels, channelMembers } from "./schema";
import { users } from "../users/schema";
import type { Channel, ChannelId, ChannelType, WorkspaceId, UserId } from "@openslaq/shared";
import { CHANNEL_TYPES } from "@openslaq/shared";
import { toChannel } from "./to-channel";

export async function listChannels(workspaceId: WorkspaceId, userId: UserId): Promise<Channel[]> {
  const memberSubquery = db
    .select()
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channels.id),
        eq(channelMembers.userId, userId),
      ),
    );

  const rows = await db
    .select({
      channel: channels,
      memberCount: count(channelMembers.userId),
    })
    .from(channels)
    .leftJoin(channelMembers, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.isArchived, false),
        or(
          eq(channels.type, CHANNEL_TYPES.PUBLIC),
          eq(channels.type, CHANNEL_TYPES.PRIVATE),
        ),
        exists(memberSubquery),
      ),
    )
    .groupBy(channels.id)
    .orderBy(channels.createdAt);

  return rows.map((r) => toChannel(r.channel, r.memberCount));
}

export async function createChannel(
  workspaceId: WorkspaceId,
  name: string,
  description: string | undefined,
  userId: UserId,
  type: ChannelType = CHANNEL_TYPES.PUBLIC,
): Promise<Channel> {
  const [channel] = await db
    .insert(channels)
    .values({
      workspaceId,
      name,
      description,
      type,
      createdBy: userId,
    })
    .returning();

  if (!channel) throw new Error("Failed to insert channel");

  // Auto-join creator to the channel
  await db.insert(channelMembers).values({
    channelId: channel.id,
    userId,
  });

  return toChannel(channel);
}

export async function joinChannel(channelId: ChannelId, userId: UserId): Promise<void> {
  await db
    .insert(channelMembers)
    .values({ channelId, userId })
    .onConflictDoNothing();
}

export async function getChannelById(channelId: ChannelId): Promise<Channel | null> {
  const row = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  });
  return row ? toChannel(row) : null;
}

export async function isChannelMember(channelId: ChannelId, userId: UserId): Promise<boolean> {
  const row = await db
    .select({ channelId: channelMembers.channelId })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId),
      ),
    )
    .limit(1);
  return row.length > 0;
}

export async function leaveChannel(channelId: ChannelId, userId: UserId): Promise<void> {
  await db
    .delete(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId),
      ),
    );
}

export async function addChannelMember(channelId: ChannelId, userId: UserId): Promise<void> {
  await db
    .insert(channelMembers)
    .values({ channelId, userId })
    .onConflictDoNothing();
}

export async function removeChannelMember(channelId: ChannelId, userId: UserId): Promise<void> {
  await db
    .delete(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId),
      ),
    );
}

export async function updateChannel(
  channelId: ChannelId,
  data: { description: string | null },
): Promise<Channel> {
  const [updated] = await db
    .update(channels)
    .set({ description: data.description })
    .where(eq(channels.id, channelId))
    .returning();
  if (!updated) throw new Error("Channel not found");
  return toChannel(updated);
}

export async function browsePublicChannels(workspaceId: WorkspaceId, userId: UserId, includeArchived = false) {
  const membershipSubquery = db
    .select({ _: channelMembers.channelId })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channels.id),
        eq(channelMembers.userId, userId),
      ),
    );

  const conditions = [
    eq(channels.workspaceId, workspaceId),
    or(
      eq(channels.type, CHANNEL_TYPES.PUBLIC),
      and(eq(channels.type, CHANNEL_TYPES.PRIVATE), exists(membershipSubquery)),
    ),
  ];
  if (!includeArchived) {
    conditions.push(eq(channels.isArchived, false));
  }

  const rows = await db
    .select({
      channel: channels,
      memberCount: count(channelMembers.userId),
      isMember: exists(membershipSubquery),
    })
    .from(channels)
    .leftJoin(channelMembers, eq(channels.id, channelMembers.channelId))
    .where(and(...conditions))
    .groupBy(channels.id)
    .orderBy(channels.name);

  return rows.map((r) => ({
    ...toChannel(r.channel, r.memberCount),
    isMember: Boolean(r.isMember),
  }));
}

export async function archiveChannel(channelId: ChannelId): Promise<Channel> {
  const [updated] = await db
    .update(channels)
    .set({ isArchived: true })
    .where(eq(channels.id, channelId))
    .returning();
  if (!updated) throw new Error("Channel not found");
  return toChannel(updated);
}

export async function unarchiveChannel(channelId: ChannelId): Promise<Channel> {
  const [updated] = await db
    .update(channels)
    .set({ isArchived: false })
    .where(eq(channels.id, channelId))
    .returning();
  if (!updated) throw new Error("Channel not found");
  return toChannel(updated);
}

export async function listChannelMembers(channelId: ChannelId) {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      joinedAt: channelMembers.joinedAt,
    })
    .from(channelMembers)
    .innerJoin(users, eq(channelMembers.userId, users.id))
    .where(eq(channelMembers.channelId, channelId))
    .limit(1000);

  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    email: r.email,
    avatarUrl: r.avatarUrl,
    joinedAt: r.joinedAt.toISOString(),
  }));
}
