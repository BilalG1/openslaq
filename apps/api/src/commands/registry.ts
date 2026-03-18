import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { botSlashCommands } from "./slash-command-schema";
import { botApps } from "../bots/schema";
import { marketplaceListings } from "../marketplace/schema";
import type { SlashCommandDefinition } from "@openslaq/shared";
import { asBotAppId } from "@openslaq/shared";
import { INTEGRATION_PLUGINS, getInternalBotSlugs } from "../integrations/registry";

export const BUILTIN_COMMANDS: SlashCommandDefinition[] = [
  {
    name: "status",
    description: "Set your status",
    usage: "/status :emoji: [status text]",
    source: "builtin",
  },
  {
    name: "remind",
    description: "Set a reminder",
    usage: "/remind [what] [when] (e.g. /remind standup in 30 minutes)",
    source: "builtin",
  },
  {
    name: "invite",
    description: "Invite a member to this channel",
    usage: "/invite @user",
    source: "builtin",
  },
  {
    name: "mute",
    description: "Mute this channel",
    usage: "/mute",
    source: "builtin",
  },
  {
    name: "unmute",
    description: "Unmute this channel",
    usage: "/unmute",
    source: "builtin",
  },
];

export async function isIntegrationInstalledInWorkspace(
  pluginSlug: string,
  workspaceId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: botApps.id })
    .from(botApps)
    .innerJoin(marketplaceListings, eq(botApps.marketplaceListingId, marketplaceListings.id))
    .where(
      and(
        eq(marketplaceListings.slug, pluginSlug),
        eq(botApps.workspaceId, workspaceId),
        eq(botApps.enabled, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listCommandsForWorkspace(
  workspaceId: string,
): Promise<SlashCommandDefinition[]> {
  // Fetch enabled bot commands
  const rows = await db
    .select({
      name: botSlashCommands.name,
      description: botSlashCommands.description,
      usage: botSlashCommands.usage,
      botAppId: botSlashCommands.botAppId,
      botName: botApps.name,
    })
    .from(botSlashCommands)
    .innerJoin(botApps, eq(botSlashCommands.botAppId, botApps.id))
    .where(
      and(
        eq(botSlashCommands.enabled, true),
        eq(botApps.workspaceId, workspaceId),
        eq(botApps.enabled, true),
      ),
    );

  const botCommands: SlashCommandDefinition[] = rows.map((r) => ({
    name: r.name,
    description: r.description,
    usage: r.usage,
    source: "bot" as const,
    botAppId: asBotAppId(r.botAppId),
    botName: r.botName,
  }));

  // Find installed integration plugins for this workspace
  const slugs = getInternalBotSlugs();
  const integrationCommands: SlashCommandDefinition[] = [];
  if (slugs.length > 0) {
    const installedSlugs = await db
      .select({ slug: marketplaceListings.slug })
      .from(botApps)
      .innerJoin(marketplaceListings, eq(botApps.marketplaceListingId, marketplaceListings.id))
      .where(
        and(
          inArray(marketplaceListings.slug, slugs),
          eq(botApps.workspaceId, workspaceId),
          eq(botApps.enabled, true),
        ),
      );

    const installedSlugSet = new Set(installedSlugs.map((r) => r.slug));
    for (const plugin of INTEGRATION_PLUGINS) {
      if (plugin.slashCommand && installedSlugSet.has(plugin.slug)) {
        integrationCommands.push(plugin.slashCommand.definition);
      }
    }
  }

  return [...BUILTIN_COMMANDS, ...botCommands, ...integrationCommands];
}
