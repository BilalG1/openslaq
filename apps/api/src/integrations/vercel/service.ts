import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { vercelConnections, vercelSubscriptions } from "./schema";
import { botApps } from "../../bots/schema";
import { marketplaceListings } from "../../marketplace/schema";

const DEFAULT_EVENTS = ["deployments", "projects", "domains", "alerts"];

export interface VercelSubscription {
  id: string;
  workspaceId: string;
  channelId: string;
  projectName: string;
  projectId: string;
  enabledEvents: string[];
  createdBy: string;
  createdAt: string;
}

export async function createSubscription(
  workspaceId: string,
  channelId: string,
  projectName: string,
  projectId: string,
  enabledEvents: string[] | undefined,
  createdBy: string,
  vercelConnectionId?: string | null,
): Promise<VercelSubscription> {
  const events = enabledEvents && enabledEvents.length > 0 ? enabledEvents : DEFAULT_EVENTS;

  const [row] = await db
    .insert(vercelSubscriptions)
    .values({
      workspaceId,
      channelId,
      projectName: projectName.toLowerCase(),
      projectId,
      enabledEvents: events,
      createdBy,
      vercelConnectionId: vercelConnectionId ?? null,
    })
    .returning();

  if (!row) throw new Error("Failed to create subscription");

  return toSubscription(row);
}

export async function deleteSubscription(
  workspaceId: string,
  channelId: string,
  projectName: string,
): Promise<boolean> {
  const rows = await db
    .delete(vercelSubscriptions)
    .where(
      and(
        eq(vercelSubscriptions.workspaceId, workspaceId),
        eq(vercelSubscriptions.channelId, channelId),
        eq(vercelSubscriptions.projectName, projectName.toLowerCase()),
      ),
    )
    .returning();

  return rows.length > 0;
}

export async function listSubscriptionsForChannel(
  workspaceId: string,
  channelId: string,
): Promise<VercelSubscription[]> {
  const rows = await db.query.vercelSubscriptions.findMany({
    where: and(
      eq(vercelSubscriptions.workspaceId, workspaceId),
      eq(vercelSubscriptions.channelId, channelId),
    ),
  });

  return rows.map(toSubscription);
}

export async function getSubscriptionsForProject(
  projectId: string,
): Promise<Array<VercelSubscription & { workspaceId: string }>> {
  const rows = await db.query.vercelSubscriptions.findMany({
    where: eq(vercelSubscriptions.projectId, projectId),
  });

  return rows.map(toSubscription);
}

export async function getVercelBotForWorkspace(
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
        eq(marketplaceListings.slug, "vercel-bot"),
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
  vercelTeamId: string,
  vercelTeamSlug: string,
  vercelConfigurationId: string,
  accessToken: string,
  connectedBy: string,
) {
  const [row] = await db
    .insert(vercelConnections)
    .values({
      workspaceId,
      vercelTeamId,
      vercelTeamSlug,
      vercelConfigurationId,
      accessToken,
      connectedBy,
    })
    .returning();

  return row;
}

export async function getConnectionForWorkspace(workspaceId: string) {
  return db.query.vercelConnections.findFirst({
    where: eq(vercelConnections.workspaceId, workspaceId),
  });
}

function toSubscription(row: typeof vercelSubscriptions.$inferSelect): VercelSubscription {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    projectName: row.projectName,
    projectId: row.projectId,
    enabledEvents: row.enabledEvents,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}
