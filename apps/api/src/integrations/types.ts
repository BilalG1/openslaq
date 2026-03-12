import type { Hono } from "hono";
import type { SlashCommandDefinition, EphemeralMessage } from "@openslaq/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHono = Hono<any, any, any>;

export interface IntegrationPlugin {
  slug: string; // matches marketplace listing slug (e.g. "github-bot")
  webhookRoutes?: AnyHono;
  setupRoutes?: AnyHono;
  slashCommand?: {
    definition: SlashCommandDefinition;
    handler: (args: string, userId: string, channelId: string, workspaceId: string) => Promise<EphemeralMessage[]>;
  };
  botSlashCommands?: Array<{ name: string; description: string; usage: string }>;
}
