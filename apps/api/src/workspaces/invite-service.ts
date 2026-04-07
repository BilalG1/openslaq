import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { workspaceInvites } from "./invite-schema";
import { workspaceMembers, workspaces } from "./schema";
import { channels, channelMembers } from "../channels/schema";
import { channelReadPositions } from "../channels/read-positions-schema";
import { DEFAULT_CHANNELS, CHANNEL_TYPES } from "@openslaq/shared";
import { dmChannelName } from "../dm/service";
import { NotFoundError, GoneError } from "../errors";

export async function createInvite(
  workspaceId: string,
  createdBy: string,
  maxUses?: number,
  expiresInHours = 168,
) {
  const code = crypto.randomBytes(9).toString("base64url");
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const [invite] = await db
    .insert(workspaceInvites)
    .values({ workspaceId, code, createdBy, maxUses: maxUses ?? null, expiresAt })
    .returning();

  if (!invite) {
    throw new Error("Failed to create invite");
  }
  return invite;
}

export async function getInviteByCode(code: string) {
  return db.query.workspaceInvites.findFirst({
    where: eq(workspaceInvites.code, code),
  });
}

export async function listInvites(workspaceId: string) {
  return db
    .select()
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        isNull(workspaceInvites.revokedAt),
        sql`(${workspaceInvites.expiresAt} IS NULL OR ${workspaceInvites.expiresAt} > NOW())`,
      ),
    );
}

export async function revokeInvite(inviteId: string, workspaceId: string) {
  const [updated] = await db
    .update(workspaceInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function acceptInvite(code: string, userId: string) {
  const invite = await getInviteByCode(code);
  if (!invite) throw new NotFoundError("Invite");

  return db.transaction(async (tx) => {
    // Check if user is already a workspace member — if yes, return success (no useCount bump)
    const existingMember = await tx.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, invite.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    });

    if (existingMember) {
      const workspace = await tx.query.workspaces.findFirst({
        where: eq(workspaces.id, invite.workspaceId),
      });
      if (!workspace) throw new NotFoundError("Workspace");
      return { workspace };
    }

    // Atomically increment useCount only if invite is still valid
    const [updated] = await tx
      .update(workspaceInvites)
      .set({ useCount: sql`${workspaceInvites.useCount} + 1` })
      .where(
        and(
          eq(workspaceInvites.id, invite.id),
          isNull(workspaceInvites.revokedAt),
          sql`(${workspaceInvites.maxUses} IS NULL OR ${workspaceInvites.useCount} < ${workspaceInvites.maxUses})`,
          sql`(${workspaceInvites.expiresAt} IS NULL OR ${workspaceInvites.expiresAt} > NOW())`,
        ),
      )
      .returning();

    if (!updated) {
      // Determine the specific error
      if (invite.revokedAt) throw new GoneError("Invite has been revoked");
      if (invite.expiresAt && invite.expiresAt < new Date())
        throw new GoneError("Invite has expired");
      throw new GoneError("Invite has reached maximum uses");
    }

    // Insert workspace membership
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: invite.workspaceId, userId, role: "member" });

    // Auto-join #general channel if it exists
    const generalChannel = await tx.query.channels.findFirst({
      where: and(
        eq(channels.workspaceId, invite.workspaceId),
        eq(channels.name, DEFAULT_CHANNELS.GENERAL),
      ),
    });
    if (generalChannel) {
      await tx
        .insert(channelMembers)
        .values({ channelId: generalChannel.id, userId })
        .onConflictDoNothing();
      await tx
        .insert(channelReadPositions)
        .values({ userId, channelId: generalChannel.id, lastReadAt: sql`now()` })
        .onConflictDoNothing();
    }

    // Auto-create self-DM (may already exist if user is rejoining)
    const selfDmName = dmChannelName(userId, userId);
    const [selfDm] = await tx
      .insert(channels)
      .values({
        workspaceId: invite.workspaceId,
        name: selfDmName,
        type: CHANNEL_TYPES.DM,
        createdBy: userId,
      })
      .onConflictDoNothing()
      .returning();
    const selfDmId = selfDm?.id ?? (
      await tx.query.channels.findFirst({
        where: and(
          eq(channels.workspaceId, invite.workspaceId),
          eq(channels.name, selfDmName),
        ),
        columns: { id: true },
      })
    )?.id;
    if (selfDmId) {
      await tx
        .insert(channelMembers)
        .values({ channelId: selfDmId, userId })
        .onConflictDoNothing();
      await tx
        .insert(channelReadPositions)
        .values({ userId, channelId: selfDmId, lastReadAt: sql`now()` })
        .onConflictDoNothing();
    }

    const workspace = await tx.query.workspaces.findFirst({
      where: eq(workspaces.id, invite.workspaceId),
    });

    if (!workspace) throw new NotFoundError("Workspace");
    return { workspace };
  });
}
