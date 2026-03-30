import { count, ilike, or, sql, eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../users/schema";
import { workspaces, workspaceMembers } from "../workspaces/schema";
import { channels } from "../channels/schema";
import { messages } from "../messages/schema";
import { attachments } from "../uploads/schema";
import { reactions } from "../reactions/schema";
import { getStackServerApp } from "./stack-server";
import { escapeLike } from "../lib/escape-like";

export async function getStats() {
  const [userCount, workspaceCount, channelCount, messageCount, attachmentCount, reactionCount] =
    await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(workspaces),
      db.select({ count: count() }).from(channels),
      db.select({ count: count() }).from(messages),
      db.select({ count: count() }).from(attachments),
      db.select({ count: count() }).from(reactions),
    ]);

  return {
    users: userCount[0]!.count,
    workspaces: workspaceCount[0]!.count,
    channels: channelCount[0]!.count,
    messages: messageCount[0]!.count,
    attachments: attachmentCount[0]!.count,
    reactions: reactionCount[0]!.count,
  };
}

export async function getActivity(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [messagesPerDay, usersPerDay] = await Promise.all([
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${messages.createdAt}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(messages)
      .where(sql`${messages.createdAt} >= ${since.toISOString()}::timestamptz`)
      .groupBy(sql`date_trunc('day', ${messages.createdAt})`)
      .orderBy(sql`date_trunc('day', ${messages.createdAt})`),
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${since.toISOString()}::timestamptz`)
      .groupBy(sql`date_trunc('day', ${users.createdAt})`)
      .orderBy(sql`date_trunc('day', ${users.createdAt})`),
  ]);

  return { messagesPerDay, usersPerDay };
}

export async function getUsers({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const offset = (page - 1) * pageSize;

  const searchCondition = search
    ? or(
        ilike(users.displayName, `%${escapeLike(search)}%`),
        ilike(users.email, `%${escapeLike(search)}%`),
      )
    : undefined;

  const messageCountSq = db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.userId, users.id));

  const workspaceCountSq = db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, users.id));

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        lastSeenAt: users.lastSeenAt,
        createdAt: users.createdAt,
        messageCount: sql<number>`(${messageCountSq})`,
        workspaceCount: sql<number>`(${workspaceCountSq})`,
      })
      .from(users)
      .where(searchCondition)
      .orderBy(users.createdAt)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(users).where(searchCondition),
  ]);

  return {
    users: rows,
    total: totalResult[0]!.count,
    page,
    pageSize,
    totalPages: Math.ceil(totalResult[0]!.count / pageSize),
  };
}

export async function getWorkspaces({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const offset = (page - 1) * pageSize;

  const searchCondition = search
    ? or(
        ilike(workspaces.name, `%${escapeLike(search)}%`),
        ilike(workspaces.slug, `%${escapeLike(search)}%`),
      )
    : undefined;

  const memberCountSq = db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaces.id));

  const channelCountSq = db
    .select({ count: count() })
    .from(channels)
    .where(eq(channels.workspaceId, workspaces.id));

  const messageCountSq = db
    .select({ count: count() })
    .from(messages)
    .where(
      sql`${messages.channelId} IN (SELECT id FROM channels WHERE workspace_id = ${workspaces.id})`,
    );

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        createdAt: workspaces.createdAt,
        memberCount: sql<number>`(${memberCountSq})`,
        channelCount: sql<number>`(${channelCountSq})`,
        messageCount: sql<number>`(${messageCountSq})`,
      })
      .from(workspaces)
      .where(searchCondition)
      .orderBy(workspaces.createdAt)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(workspaces).where(searchCondition),
  ]);

  // Fetch feature flags for each workspace
  const { getFeatureFlags } = await import("../workspaces/feature-flags");
  const workspacesWithFlags = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      flags: await getFeatureFlags(row.id),
    })),
  );

  return {
    workspaces: workspacesWithFlags,
    total: totalResult[0]!.count,
    page,
    pageSize,
    totalPages: Math.ceil(totalResult[0]!.count / pageSize),
  };
}


export async function createImpersonationSnippet(
  userId: string,
  projectId: string,
): Promise<string> {
  const stackServer = getStackServerApp();
  const user = await stackServer.getUser(userId);
  if (!user) {
    throw new Error("User not found in Stack Auth");
  }

  const session = await user.createSession({ expiresInMillis: 2 * 60 * 60 * 1000 });
  const tokens = await session.getTokens();
  const accessToken = tokens.accessToken;
  const refreshToken = tokens.refreshToken;

  // Defense-in-depth: strip non-printable characters from userId
  const safeUserId = userId.replace(/[^\x20-\x7E]/g, "");

  return [
    `// Impersonating: ${safeUserId}`,
    `document.cookie = "stack-refresh-${projectId}--default=" + encodeURIComponent(JSON.stringify({ refresh_token: "${refreshToken}", updated_at_millis: Date.now() })) + "; path=/";`,
    `document.cookie = "stack-access=" + encodeURIComponent(JSON.stringify(["${refreshToken}", "${accessToken}"])) + "; path=/";`,
    `location.reload();`,
  ].join("\n");
}
