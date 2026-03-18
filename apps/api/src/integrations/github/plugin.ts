import type { IntegrationPlugin } from "../types";
import webhookRoutes from "./webhook-routes";
import setupRoutes from "./setup-routes";
import { handleGithub } from "./slash-command";

export const githubPlugin: IntegrationPlugin = {
  slug: "github-bot",
  webhookRoutes,
  setupRoutes,
  slashCommand: {
    definition: {
      name: "github",
      description: "Manage GitHub repo subscriptions",
      usage: "/github subscribe owner/repo [events]",
      source: "integration",
    },
    handler: handleGithub,
  },
  botSlashCommands: [
    {
      name: "github",
      description: "Manage GitHub repo subscriptions",
      usage: "/github subscribe owner/repo [events]",
    },
  ],
};
