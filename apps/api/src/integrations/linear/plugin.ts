import type { IntegrationPlugin } from "../types";
import webhookRoutes from "./webhook-routes";
import setupRoutes from "./setup-routes";
import { handleLinear } from "./slash-command";

export const linearPlugin: IntegrationPlugin = {
  slug: "linear-bot",
  webhookRoutes,
  setupRoutes,
  slashCommand: {
    definition: {
      name: "linear",
      description: "Manage Linear team subscriptions",
      usage: "/linear subscribe TEAM-KEY [events]",
      source: "integration",
    },
    handler: handleLinear,
  },
  botSlashCommands: [
    {
      name: "linear",
      description: "Manage Linear team subscriptions",
      usage: "/linear subscribe TEAM-KEY [events]",
    },
  ],
};
