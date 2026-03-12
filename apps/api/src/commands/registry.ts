import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { botSlashCommands } from "./slash-command-schema";
import { botApps } from "../bots/schema";
import type { SlashCommandDefinition } from "@openslaq/shared";
import { asBotAppId } from "@openslaq/shared";
import { INTEGRATION_PLUGINS } from "../integrations/registry";

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
  // Integration plugin commands
  ...INTEGRATION_PLUGINS
    .filter((p) => p.slashCommand)
    .map((p) => p.slashCommand!.definition),
];

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

  return [...BUILTIN_COMMANDS, ...botCommands];
}
