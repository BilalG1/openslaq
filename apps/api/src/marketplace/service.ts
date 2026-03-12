import { eq, and } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { marketplaceListings, marketplaceAuthCodes } from "./schema";
import { botApps } from "../bots/schema";
import { createBotApp, deleteBotApp } from "../bots/service";
import { botSlashCommands } from "../commands/slash-command-schema";
import type { MarketplaceListing, BotScope, BotEventType } from "@openslaq/shared";

function toPublicListing(row: typeof marketplaceListings.$inferSelect): MarketplaceListing {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    longDescription: row.longDescription,
    avatarUrl: row.avatarUrl,
    category: row.category,
    requestedScopes: row.requestedScopes as BotScope[],
    requestedEvents: row.requestedEvents as BotEventType[],
    published: row.published,
  };
}

export async function listListings(): Promise<MarketplaceListing[]> {
  const rows = await db.query.marketplaceListings.findMany({
    where: eq(marketplaceListings.published, true),
  });
  return rows.map(toPublicListing);
}

export async function getListingBySlug(slug: string): Promise<MarketplaceListing | null> {
  const row = await db.query.marketplaceListings.findFirst({
    where: and(eq(marketplaceListings.slug, slug), eq(marketplaceListings.published, true)),
  });
  return row ? toPublicListing(row) : null;
}

export async function getListingByClientId(clientId: string) {
  return db.query.marketplaceListings.findFirst({
    where: eq(marketplaceListings.clientId, clientId),
  });
}

export async function isInstalledInWorkspace(listingId: string, workspaceId: string): Promise<boolean> {
  const row = await db.query.botApps.findFirst({
    where: and(
      eq(botApps.marketplaceListingId, listingId),
      eq(botApps.workspaceId, workspaceId),
    ),
  });
  return !!row;
}

export async function listInstalledInWorkspace(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ marketplaceListingId: botApps.marketplaceListingId })
    .from(botApps)
    .where(
      and(
        eq(botApps.workspaceId, workspaceId),
        // Only marketplace-installed bots (not manually created)
      ),
    );
  return rows
    .map((r) => r.marketplaceListingId)
    .filter((id): id is string => id !== null);
}

export async function createAuthCode(
  listingId: string,
  workspaceId: string,
  authorizedBy: string,
): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.insert(marketplaceAuthCodes).values({
    code,
    listingId,
    workspaceId,
    authorizedBy,
    expiresAt,
  });

  return code;
}

export async function exchangeAuthCode(
  code: string,
  clientId: string,
  clientSecretPlaintext: string,
): Promise<{
  accessToken: string;
  botAppId: string;
  workspaceId: string;
} | null> {
  // Look up the auth code
  const authCode = await db.query.marketplaceAuthCodes.findFirst({
    where: eq(marketplaceAuthCodes.code, code),
  });
  if (!authCode) return null;

  // Check not expired
  if (authCode.expiresAt < new Date()) return null;

  // Check not already used
  if (authCode.usedAt) return null;

  // Verify clientId matches the listing
  const listing = await db.query.marketplaceListings.findFirst({
    where: and(
      eq(marketplaceListings.id, authCode.listingId),
      eq(marketplaceListings.clientId, clientId),
    ),
  });
  if (!listing) return null;

  // Verify client secret
  const secretHash = createHash("sha256").update(clientSecretPlaintext).digest("hex");
  if (secretHash !== listing.clientSecret) return null;

  // Create the bot app using existing service
  const { bot, apiToken } = await createBotApp(
    authCode.workspaceId,
    listing.name,
    listing.description,
    listing.avatarUrl,
    listing.webhookUrl,
    listing.requestedScopes as BotScope[],
    listing.requestedEvents as BotEventType[],
    authCode.authorizedBy,
    listing.id,
  );

  // Mark code as used
  await db
    .update(marketplaceAuthCodes)
    .set({ usedAt: new Date() })
    .where(eq(marketplaceAuthCodes.id, authCode.id));

  return {
    accessToken: apiToken,
    botAppId: bot.id,
    workspaceId: authCode.workspaceId,
  };
}

/**
 * Install an internal (first-party) bot directly — skips OAuth dance.
 * Creates the botApp and registers any slash commands.
 */
export async function installInternalBot(
  listing: typeof marketplaceListings.$inferSelect,
  workspaceId: string,
  installedBy: string,
): Promise<void> {
  const { bot } = await createBotApp(
    workspaceId,
    listing.name,
    listing.description,
    listing.avatarUrl,
    listing.webhookUrl,
    listing.requestedScopes as BotScope[],
    listing.requestedEvents as BotEventType[],
    installedBy,
    listing.id,
  );

  // Register slash commands from integration plugin
  const { getPluginBySlug } = await import("../integrations/registry");
  const plugin = getPluginBySlug(listing.slug);
  if (plugin?.botSlashCommands) {
    for (const cmd of plugin.botSlashCommands) {
      await db.insert(botSlashCommands).values({
        botAppId: bot.id,
        name: cmd.name,
        description: cmd.description,
        usage: cmd.usage,
      }).onConflictDoNothing();
    }
  }
}

export async function uninstallListing(listingId: string, workspaceId: string): Promise<boolean> {
  const bot = await db.query.botApps.findFirst({
    where: and(
      eq(botApps.marketplaceListingId, listingId),
      eq(botApps.workspaceId, workspaceId),
    ),
  });
  if (!bot) return false;

  return deleteBotApp(bot.id, workspaceId);
}
