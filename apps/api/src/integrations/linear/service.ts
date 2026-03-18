import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { linearConnections, linearSubscriptions } from "./schema";
import { botApps } from "../../bots/schema";
import { marketplaceListings } from "../../marketplace/schema";

const DEFAULT_EVENTS = ["issues", "comments", "projects", "cycles"];

export interface LinearSubscription {
  id: string;
  workspaceId: string;
  channelId: string;
  teamKey: string;
  teamId: string;
  enabledEvents: string[];
  createdBy: string;
  createdAt: string;
}

export async function createSubscription(
  workspaceId: string,
  channelId: string,
  teamKey: string,
  teamId: string,
  enabledEvents: string[] | undefined,
  createdBy: string,
  linearConnectionId?: string | null,
): Promise<LinearSubscription> {
  const events = enabledEvents && enabledEvents.length > 0 ? enabledEvents : DEFAULT_EVENTS;

  const [row] = await db
    .insert(linearSubscriptions)
    .values({
      workspaceId,
      channelId,
      teamKey: teamKey.toUpperCase(),
      teamId,
      enabledEvents: events,
      createdBy,
      linearConnectionId: linearConnectionId ?? null,
    })
    .returning();

  if (!row) throw new Error("Failed to create subscription");

  return toSubscription(row);
}

export async function deleteSubscription(
  workspaceId: string,
  channelId: string,
  teamKey: string,
): Promise<boolean> {
  const rows = await db
    .delete(linearSubscriptions)
    .where(
      and(
        eq(linearSubscriptions.workspaceId, workspaceId),
        eq(linearSubscriptions.channelId, channelId),
        eq(linearSubscriptions.teamKey, teamKey.toUpperCase()),
      ),
    )
    .returning();

  return rows.length > 0;
}

export async function listSubscriptionsForChannel(
  workspaceId: string,
  channelId: string,
): Promise<LinearSubscription[]> {
  const rows = await db.query.linearSubscriptions.findMany({
    where: and(
      eq(linearSubscriptions.workspaceId, workspaceId),
      eq(linearSubscriptions.channelId, channelId),
    ),
  });

  return rows.map(toSubscription);
}

export async function getSubscriptionsForTeam(
  teamId: string,
): Promise<Array<LinearSubscription & { workspaceId: string }>> {
  const rows = await db.query.linearSubscriptions.findMany({
    where: eq(linearSubscriptions.teamId, teamId),
  });

  return rows.map(toSubscription);
}

export async function getLinearBotForWorkspace(
  workspaceId: string,
): Promise<{ botAppId: string; userId: string } | null> {
  const row = await db
    .select({
      botAppId: botApps.id,
      userId: botApps.userId,
    })
    .from(botApps)
    .innerJoin(marketplaceListings, eq(botApps.marketplaceListingId, marketplaceListings.id))
    .where(
      and(
        eq(botApps.workspaceId, workspaceId),
        eq(marketplaceListings.slug, "linear-bot"),
        eq(botApps.enabled, true),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  return row ?? null;
}

// --- Connection CRUD ---

export async function createConnection(
  workspaceId: string,
  linearOrganizationId: string,
  linearOrganizationName: string,
  accessToken: string,
  connectedBy: string,
) {
  const [row] = await db
    .insert(linearConnections)
    .values({
      workspaceId,
      linearOrganizationId,
      linearOrganizationName,
      accessToken,
      connectedBy,
    })
    .returning();

  return row;
}

export async function getConnectionForWorkspace(workspaceId: string) {
  return db.query.linearConnections.findFirst({
    where: eq(linearConnections.workspaceId, workspaceId),
  });
}

function toSubscription(row: typeof linearSubscriptions.$inferSelect): LinearSubscription {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    teamKey: row.teamKey,
    teamId: row.teamId,
    enabledEvents: row.enabledEvents,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}
