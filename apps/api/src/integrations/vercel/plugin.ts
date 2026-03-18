import type { IntegrationPlugin } from "../types";
import webhookRoutes from "./webhook-routes";
import setupRoutes from "./setup-routes";
import { handleVercel } from "./slash-command";

export const vercelPlugin: IntegrationPlugin = {
  slug: "vercel-bot",
  webhookRoutes,
  setupRoutes,
  slashCommand: {
    definition: {
      name: "vercel",
      description: "Manage Vercel project subscriptions",
      usage: "/vercel subscribe PROJECT-NAME [events]",
      source: "integration",
    },
    handler: handleVercel,
  },
  botSlashCommands: [
    {
      name: "vercel",
      description: "Manage Vercel project subscriptions",
      usage: "/vercel subscribe PROJECT-NAME [events]",
    },
  ],
};
