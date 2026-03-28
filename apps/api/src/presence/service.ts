import { eq, and, sql, count as drizzleCount } from "drizzle-orm";
import { db } from "../db";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import { presenceConnections } from "./schema";
import { isStatusExpired } from "../users/service";

export const MAX_SOCKETS_PER_USER = 5;

export async function addSocket(userId: string, socketId: string): Promise<boolean> {
  // Check if user already has connections
  const existing = await db.query.presenceConnections.findFirst({
    where: eq(presenceConnections.userId, userId),
  });

  await db.insert(presenceConnections).values({
    userId,
    socketId,
    lastHeartbeat: new Date(),
  }).onConflictDoUpdate({
    target: [presenceConnections.userId, presenceConnections.socketId],
    set: { lastHeartbeat: new Date() },
  });

  return !existing; // true if first connection (came online)
}

export async function removeSocket(userId: string, socketId: string): Promise<boolean> {
  const deleted = await db
    .delete(presenceConnections)
    .where(
      and(
        eq(presenceConnections.userId, userId),
        eq(presenceConnections.socketId, socketId),
      ),
    )
    .returning();

  if (deleted.length === 0) return false;

  // Check if any sockets remain
  const remaining = await db.query.presenceConnections.findFirst({
    where: eq(presenceConnections.userId, userId),
  });

  return !remaining; // true if went offline
}

export async function getOnlineUserIds(): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ userId: presenceConnections.userId })
    .from(presenceConnections)
    .where(sql`${presenceConnections.lastHeartbeat} > now() - interval '60 seconds'`);
  return new Set(rows.map((r) => r.userId));
}

export async function removeAllSocketsForUser(userId: string): Promise<void> {
  await db.delete(presenceConnections).where(eq(presenceConnections.userId, userId));
}

export async function getSocketCountForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: drizzleCount() })
    .from(presenceConnections)
    .where(eq(presenceConnections.userId, userId));
  return row?.count ?? 0;
}

export async function getSocketIdsForUser(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ socketId: presenceConnections.socketId })
    .from(presenceConnections)
    .where(eq(presenceConnections.userId, userId));
  return new Set(rows.map((r) => r.socketId));
}

export async function updateHeartbeat(userId: string, socketId: string): Promise<void> {
  await db.update(presenceConnections)
    .set({ lastHeartbeat: new Date() })
    .where(
      and(
        eq(presenceConnections.userId, userId),
        eq(presenceConnections.socketId, socketId),
      ),
    );
}

export async function cleanupStalePresence(): Promise<void> {
  await db
    .delete(presenceConnections)
    .where(sql`${presenceConnections.lastHeartbeat} < now() - interval '90 seconds'`);
}

export async function persistLastSeen(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  return rows.map((r) => r.workspaceId);
}

export async function getWorkspacePresence(
  workspaceId: string,
): Promise<Array<{
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
  statusEmoji: string | null;
  statusText: string | null;
  statusExpiresAt: string | null;
}>> {
  const members = await db
    .select({
      userId: workspaceMembers.userId,
      lastSeenAt: users.lastSeenAt,
      statusEmoji: users.statusEmoji,
      statusText: users.statusText,
      statusExpiresAt: users.statusExpiresAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const onlineIds = await getOnlineUserIds();
  return members.map((m) => {
    const expired = isStatusExpired(m.statusExpiresAt);
    return {
      userId: m.userId,
      online: onlineIds.has(m.userId),
      lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
      statusEmoji: expired ? null : (m.statusEmoji ?? null),
      statusText: expired ? null : (m.statusText ?? null),
      statusExpiresAt: expired ? null : (m.statusExpiresAt?.toISOString() ?? null),
    };
  });
}
