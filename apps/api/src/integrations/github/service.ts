import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { githubInstallations, githubSubscriptions } from "./schema";
import { botApps } from "../../bots/schema";
import { marketplaceListings } from "../../marketplace/schema";

const DEFAULT_EVENTS = ["pulls", "reviews", "checks"];

export interface GithubSubscription {
  id: string;
  workspaceId: string;
  channelId: string;
  repoFullName: string;
  enabledEvents: string[];
  createdBy: string;
  createdAt: string;
}

export async function createSubscription(
  workspaceId: string,
  channelId: string,
  repoFullName: string,
  enabledEvents: string[] | undefined,
  createdBy: string,
  githubInstallationId?: string | null,
): Promise<GithubSubscription> {
  const events = enabledEvents && enabledEvents.length > 0 ? enabledEvents : DEFAULT_EVENTS;

  const [row] = await db
    .insert(githubSubscriptions)
    .values({
      workspaceId,
      channelId,
      repoFullName: repoFullName.toLowerCase(),
      enabledEvents: events,
      createdBy,
      githubInstallationId: githubInstallationId ?? null,
    })
    .returning();

  if (!row) throw new Error("Failed to create subscription");

  return toSubscription(row);
}

export async function deleteSubscription(
  workspaceId: string,
  channelId: string,
  repoFullName: string,
): Promise<boolean> {
  const rows = await db
    .delete(githubSubscriptions)
    .where(
      and(
        eq(githubSubscriptions.workspaceId, workspaceId),
        eq(githubSubscriptions.channelId, channelId),
        eq(githubSubscriptions.repoFullName, repoFullName.toLowerCase()),
      ),
    )
    .returning();

  return rows.length > 0;
}

export async function listSubscriptionsForChannel(
  workspaceId: string,
  channelId: string,
): Promise<GithubSubscription[]> {
  const rows = await db.query.githubSubscriptions.findMany({
    where: and(
      eq(githubSubscriptions.workspaceId, workspaceId),
      eq(githubSubscriptions.channelId, channelId),
    ),
  });

  return rows.map(toSubscription);
}

export async function getSubscriptionsForRepo(
  repoFullName: string,
): Promise<Array<GithubSubscription & { workspaceId: string }>> {
  const rows = await db.query.githubSubscriptions.findMany({
    where: eq(githubSubscriptions.repoFullName, repoFullName.toLowerCase()),
  });

  return rows.map(toSubscription);
}

export async function getGithubBotForWorkspace(
  workspaceId: string,
): Promise<{ botAppId: string; userId: string } | null> {
  // Find the bot app installed from the github-bot marketplace listing
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
        eq(marketplaceListings.slug, "github-bot"),
        eq(botApps.enabled, true),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  return row ?? null;
}

// --- Installation CRUD ---

export async function createInstallation(
  workspaceId: string,
  githubInstallationId: string,
  githubAccountLogin: string,
  githubAccountType: string,
  installedBy: string,
) {
  const [row] = await db
    .insert(githubInstallations)
    .values({
      workspaceId,
      githubInstallationId,
      githubAccountLogin,
      githubAccountType,
      installedBy,
    })
    .returning();

  return row;
}

export async function getInstallationForWorkspace(workspaceId: string) {
  return db.query.githubInstallations.findFirst({
    where: eq(githubInstallations.workspaceId, workspaceId),
  });
}

function toSubscription(row: typeof githubSubscriptions.$inferSelect): GithubSubscription {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    repoFullName: row.repoFullName,
    enabledEvents: row.enabledEvents,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}
