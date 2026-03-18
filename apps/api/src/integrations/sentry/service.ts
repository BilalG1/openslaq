import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { sentryConnections, sentrySubscriptions } from "./schema";
import { botApps } from "../../bots/schema";
import { marketplaceListings } from "../../marketplace/schema";

const DEFAULT_EVENTS = ["issues", "metrics", "deploys"];

export interface SentrySubscription {
  id: string;
  workspaceId: string;
  channelId: string;
  projectSlug: string;
  projectId: string;
  enabledEvents: string[];
  createdBy: string;
  createdAt: string;
}

export async function createSubscription(
  workspaceId: string,
  channelId: string,
  projectSlug: string,
  projectId: string,
  enabledEvents: string[] | undefined,
  createdBy: string,
  sentryConnectionId?: string | null,
): Promise<SentrySubscription> {
  const events = enabledEvents && enabledEvents.length > 0 ? enabledEvents : DEFAULT_EVENTS;

  const [row] = await db
    .insert(sentrySubscriptions)
    .values({
      workspaceId,
      channelId,
      projectSlug: projectSlug.toLowerCase(),
      projectId,
      enabledEvents: events,
      createdBy,
      sentryConnectionId: sentryConnectionId ?? null,
    })
    .returning();

  if (!row) throw new Error("Failed to create subscription");

  return toSubscription(row);
}

export async function deleteSubscription(
  workspaceId: string,
  channelId: string,
  projectSlug: string,
): Promise<boolean> {
  const rows = await db
    .delete(sentrySubscriptions)
    .where(
      and(
        eq(sentrySubscriptions.workspaceId, workspaceId),
        eq(sentrySubscriptions.channelId, channelId),
        eq(sentrySubscriptions.projectSlug, projectSlug.toLowerCase()),
      ),
    )
    .returning();

  return rows.length > 0;
}

export async function listSubscriptionsForChannel(
  workspaceId: string,
  channelId: string,
): Promise<SentrySubscription[]> {
  const rows = await db.query.sentrySubscriptions.findMany({
    where: and(
      eq(sentrySubscriptions.workspaceId, workspaceId),
      eq(sentrySubscriptions.channelId, channelId),
    ),
  });

  return rows.map(toSubscription);
}

export async function getSubscriptionsForProject(
  projectId: string,
): Promise<Array<SentrySubscription & { workspaceId: string }>> {
  const rows = await db.query.sentrySubscriptions.findMany({
    where: eq(sentrySubscriptions.projectId, projectId),
  });

  return rows.map(toSubscription);
}

export async function getSentryBotForWorkspace(
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
        eq(marketplaceListings.slug, "sentry-bot"),
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
  sentryOrganizationSlug: string,
  sentryInstallationId: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date,
  connectedBy: string,
) {
  const [row] = await db
    .insert(sentryConnections)
    .values({
      workspaceId,
      sentryOrganizationSlug,
      sentryInstallationId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      connectedBy,
    })
    .returning();

  return row;
}

export async function getConnectionForWorkspace(workspaceId: string) {
  return db.query.sentryConnections.findFirst({
    where: eq(sentryConnections.workspaceId, workspaceId),
  });
}

export async function updateConnectionTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date,
) {
  await db
    .update(sentryConnections)
    .set({ accessToken, refreshToken, tokenExpiresAt, updatedAt: new Date() })
    .where(eq(sentryConnections.id, connectionId));
}

function toSubscription(row: typeof sentrySubscriptions.$inferSelect): SentrySubscription {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    projectSlug: row.projectSlug,
    projectId: row.projectId,
    enabledEvents: row.enabledEvents,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}
