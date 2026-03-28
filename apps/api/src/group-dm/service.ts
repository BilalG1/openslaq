import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { channels, channelMembers } from "../channels/schema";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import type { Channel, WorkspaceId, UserId } from "@openslaq/shared";
import { asChannelId, asUserId, CHANNEL_TYPES } from "@openslaq/shared";
import { toChannel } from "../channels/to-channel";
import { initializeReadPositions } from "../channels/read-positions-service";

export interface GroupDmMember {
  id: UserId;
  displayName: string;
  avatarUrl: string | null;
}

export interface GroupDmResult {
  channel: Channel;
  members: GroupDmMember[];
  created: boolean;
}

export interface GroupDmListItem {
  channel: Channel;
  members: GroupDmMember[];
}

export function generateDisplayName(names: string[]): string {
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  if (sorted.length <= 3) {
    return sorted.join(", ");
  }
  return `${sorted.slice(0, 3).join(", ")} and ${sorted.length - 3} other${sorted.length - 3 > 1 ? "s" : ""}`;
}

export async function createGroupDm(
  workspaceId: WorkspaceId,
  creatorId: UserId,
  memberIds: string[],
): Promise<GroupDmResult | { error: string }> {
  // Dedup and include creator
  const allMemberIds = Array.from(new Set([creatorId as string, ...memberIds]));

  if (allMemberIds.length < 3) {
    return { error: "Group DMs require at least 3 members" };
  }
  if (allMemberIds.length > 9) {
    return { error: "Group DMs can have at most 9 members" };
  }

  // Verify all are workspace members
  const memberships = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        inArray(workspaceMembers.userId, allMemberIds),
      ),
    );

  const memberSet = new Set(memberships.map((m) => m.userId));
  const nonMembers = allMemberIds.filter((id) => !memberSet.has(id));
  if (nonMembers.length > 0) {
    return { error: "Some users are not workspace members" };
  }

  // Check for existing group DM with exact same member set
  const sortedIds = [...allMemberIds].sort();
  const existingGroupDms = await db
    .select({ channelId: channelMembers.channelId, userId: channelMembers.userId })
    .from(channelMembers)
    .innerJoin(channels, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, CHANNEL_TYPES.GROUP_DM),
      ),
    );

  // Group by channel and check for exact member match in memory
  const channelMemberMap = new Map<string, string[]>();
  for (const row of existingGroupDms) {
    const arr = channelMemberMap.get(row.channelId) ?? [];
    arr.push(row.userId);
    channelMemberMap.set(row.channelId, arr);
  }

  for (const [channelId, memberUserIds] of channelMemberMap) {
    const existingSorted = [...memberUserIds].sort();
    if (
      existingSorted.length === sortedIds.length &&
      existingSorted.every((id, i) => id === sortedIds[i])
    ) {
      // Found existing group DM with same members
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });
      if (channel) {
        const memberDetails = await getGroupDmMembers(channelId);
        return { channel: toChannel(channel), members: memberDetails, created: false };
      }
    }
  }

  // Fetch member names for display name
  const memberUsers = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, allMemberIds));

  const displayName = generateDisplayName(memberUsers.map((u) => u.displayName));

  // Create new group DM channel
  const [channel] = await db
    .insert(channels)
    .values({
      workspaceId,
      name: `gdm:${crypto.randomUUID()}`,
      type: CHANNEL_TYPES.GROUP_DM,
      displayName,
      createdBy: creatorId,
    })
    .returning();

  if (!channel) throw new Error("Failed to create group DM channel");

  // Add all members
  await db.insert(channelMembers).values(
    allMemberIds.map((userId) => ({
      channelId: channel.id,
      userId,
    })),
  );
  await initializeReadPositions(asChannelId(channel.id), allMemberIds.map(asUserId));

  const memberDetails: GroupDmMember[] = memberUsers.map((u) => ({
    id: asUserId(u.id),
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  }));

  return { channel: toChannel(channel), members: memberDetails, created: true };
}

export async function listGroupDms(
  workspaceId: WorkspaceId,
  userId: UserId,
): Promise<GroupDmListItem[]> {
  // Subquery: group DM channel IDs where this user is a member
  const userGroupDmChannelIds = db
    .select({ channelId: channelMembers.channelId })
    .from(channelMembers)
    .innerJoin(channels, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channelMembers.userId, userId),
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, CHANNEL_TYPES.GROUP_DM),
      ),
    );

  const channelRows = await db
    .select()
    .from(channels)
    .where(inArray(channels.id, userGroupDmChannelIds));

  if (channelRows.length === 0) return [];

  // Batch-fetch all members across all group DMs in a single query
  const channelIds = channelRows.map((c) => c.id);
  const memberRows = await db
    .select({
      channelId: channelMembers.channelId,
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(channelMembers)
    .innerJoin(users, eq(channelMembers.userId, users.id))
    .where(inArray(channelMembers.channelId, channelIds));

  // Group members by channel
  const membersByChannel = new Map<string, GroupDmMember[]>();
  for (const row of memberRows) {
    const arr = membersByChannel.get(row.channelId) ?? [];
    arr.push({ id: asUserId(row.id), displayName: row.displayName, avatarUrl: row.avatarUrl });
    membersByChannel.set(row.channelId, arr);
  }

  return channelRows.map((channel) => ({
    channel: toChannel(channel),
    members: membersByChannel.get(channel.id) ?? [],
  }));
}

export async function addGroupDmMember(
  channelId: string,
  addedByUserId: UserId,
  newUserId: string,
  workspaceId: WorkspaceId,
): Promise<{ error: string } | { members: GroupDmMember[] }> {
  // Verify the channel exists and is a group DM
  const channel = await db.query.channels.findFirst({
    where: and(eq(channels.id, channelId), eq(channels.type, CHANNEL_TYPES.GROUP_DM)),
  });
  if (!channel) return { error: "Group DM not found" };

  // Verify the channel belongs to the requested workspace
  if (channel.workspaceId !== workspaceId) return { error: "Group DM not found" };

  // Verify adder is a member
  const adderMembership = await db.query.channelMembers.findFirst({
    where: and(
      eq(channelMembers.channelId, channelId),
      eq(channelMembers.userId, addedByUserId),
    ),
  });
  if (!adderMembership) return { error: "You are not a member of this group DM" };

  // Verify new user is a workspace member
  const wsMembers = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, channel.workspaceId),
      eq(workspaceMembers.userId, newUserId),
    ),
  });
  if (!wsMembers) return { error: "User is not a workspace member" };

  // Check member count
  const currentMembers = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId));

  if (currentMembers.length >= 9) {
    return { error: "Group DM cannot exceed 9 members" };
  }

  // Check if already a member
  if (currentMembers.some((m) => m.userId === newUserId)) {
    return { error: "User is already a member" };
  }

  // Add the member
  await db.insert(channelMembers).values({ channelId, userId: newUserId });
  await initializeReadPositions(asChannelId(channelId), [asUserId(newUserId)]);

  // Regenerate display name
  const allMemberIds = [...currentMembers.map((m) => m.userId), newUserId];
  const memberUsers = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(inArray(users.id, allMemberIds));

  const newDisplayName = generateDisplayName(memberUsers.map((u) => u.displayName));
  await db.update(channels).set({ displayName: newDisplayName }).where(eq(channels.id, channelId));

  const members = await getGroupDmMembers(channelId);
  return { members };
}

export async function leaveGroupDm(
  channelId: string,
  userId: UserId,
  workspaceId: WorkspaceId,
): Promise<{ error: string } | { ok: true }> {
  const channel = await db.query.channels.findFirst({
    where: and(eq(channels.id, channelId), eq(channels.type, CHANNEL_TYPES.GROUP_DM)),
  });
  if (!channel) return { error: "Group DM not found" };

  // Verify the channel belongs to the requested workspace
  if (channel.workspaceId !== workspaceId) return { error: "Group DM not found" };

  // Verify user is a member
  const membership = await db.query.channelMembers.findFirst({
    where: and(
      eq(channelMembers.channelId, channelId),
      eq(channelMembers.userId, userId),
    ),
  });
  if (!membership) return { error: "You are not a member of this group DM" };

  // Remove the member
  await db
    .delete(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId),
      ),
    );

  // Regenerate display name
  const remainingMembers = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId));

  if (remainingMembers.length > 0) {
    const memberUsers = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, remainingMembers.map((m) => m.userId)));

    const newDisplayName = generateDisplayName(memberUsers.map((u) => u.displayName));
    await db.update(channels).set({ displayName: newDisplayName }).where(eq(channels.id, channelId));
  }

  return { ok: true };
}

export async function renameGroupDm(
  channelId: string,
  userId: UserId,
  newDisplayName: string,
  workspaceId: WorkspaceId,
): Promise<{ error: string } | { channel: Channel }> {
  const channel = await db.query.channels.findFirst({
    where: and(eq(channels.id, channelId), eq(channels.type, CHANNEL_TYPES.GROUP_DM)),
  });
  if (!channel) return { error: "Group DM not found" };

  // Verify the channel belongs to the requested workspace
  if (channel.workspaceId !== workspaceId) return { error: "Group DM not found" };

  // Verify user is a member
  const membership = await db.query.channelMembers.findFirst({
    where: and(
      eq(channelMembers.channelId, channelId),
      eq(channelMembers.userId, userId),
    ),
  });
  if (!membership) return { error: "You are not a member of this group DM" };

  const [updated] = await db
    .update(channels)
    .set({ displayName: newDisplayName })
    .where(eq(channels.id, channelId))
    .returning();

  if (!updated) throw new Error("Failed to rename group DM");

  return { channel: toChannel(updated) };
}

async function getGroupDmMembers(channelId: string): Promise<GroupDmMember[]> {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(channelMembers)
    .innerJoin(users, eq(channelMembers.userId, users.id))
    .where(eq(channelMembers.channelId, channelId));

  return rows.map((r) => ({
    id: asUserId(r.id),
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
  }));
}
