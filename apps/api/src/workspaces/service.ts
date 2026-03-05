import { and, count, eq, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../db";
import { workspaces, workspaceMembers } from "./schema";
import { channels, channelMembers } from "../channels/schema";
import type { Workspace, WorkspaceId, UserId, Role } from "@openslaq/shared";
import { asWorkspaceId, ROLES, DEFAULT_CHANNELS } from "@openslaq/shared";

function toWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: asWorkspaceId(row.id),
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface WorkspaceWithRole extends Workspace {
  role: Role;
  memberCount: number;
}

export async function getWorkspacesForUser(userId: UserId): Promise<WorkspaceWithRole[]> {
  // Get workspaces the user belongs to, with their role
  const userRows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      createdAt: workspaces.createdAt,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  if (userRows.length === 0) return [];

  // Get member counts for those workspaces
  const wsIds = userRows.map((r) => r.id);
  const countRows = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      memberCount: count(workspaceMembers.userId),
    })
    .from(workspaceMembers)
    .where(inArray(workspaceMembers.workspaceId, wsIds))
    .groupBy(workspaceMembers.workspaceId);

  const countMap = new Map(countRows.map((r) => [r.workspaceId, r.memberCount]));

  return userRows.map((row) => ({
    id: asWorkspaceId(row.id),
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    role: row.role,
    memberCount: countMap.get(row.id) ?? 0,
  }));
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | undefined> {
  const row = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });
  return row ? toWorkspace(row) : undefined;
}

export async function getWorkspaceById(id: WorkspaceId): Promise<Workspace | undefined> {
  const row = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, id),
  });
  return row ? toWorkspace(row) : undefined;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function generateSlug(name: string): string {
  const base = slugify(name) || "workspace";
  const suffix = crypto.randomBytes(4).toString("base64url").slice(0, 6).toLowerCase();
  return `${base}-${suffix}`;
}

export async function createWorkspace(
  name: string,
  userId: UserId,
): Promise<Workspace | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug(name);
    const result = await tryCreateWorkspace(name, slug, userId);
    if (result !== null) return result;
  }
  return null;
}

async function tryCreateWorkspace(
  name: string,
  slug: string,
  userId: UserId,
): Promise<Workspace | null> {
  try {
    return await db.transaction(async (tx) => {
      const [workspace] = await tx.insert(workspaces).values({ name, slug }).returning();
      if (!workspace) return null;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: ROLES.OWNER,
      });

      // Auto-create #general channel and join the creator
      const [generalChannel] = await tx
        .insert(channels)
        .values({
          workspaceId: workspace.id,
          name: DEFAULT_CHANNELS.GENERAL,
          description: "Company-wide announcements and general conversation",
          createdBy: userId,
        })
        .returning();

      if (generalChannel) {
        await tx.insert(channelMembers).values({
          channelId: generalChannel.id,
          userId,
        });
      }

      return toWorkspace(workspace);
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("duplicate key")
    ) {
      return null;
    }
    throw err;
  }
}

export async function getWorkspaceMember(workspaceId: WorkspaceId, userId: UserId) {
  const rows = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateMemberRole(workspaceId: WorkspaceId, targetUserId: UserId, newRole: Role) {
  const [updated] = await db
    .update(workspaceMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function removeMember(workspaceId: WorkspaceId, targetUserId: UserId) {
  const [deleted] = await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId),
      ),
    )
    .returning();
  return deleted ?? null;
}

export async function deleteWorkspace(workspaceId: WorkspaceId) {
  // All related tables (channels, messages, members, reactions, attachments,
  // invites, bots, emojis, etc.) cascade-delete via FK constraints.
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}
