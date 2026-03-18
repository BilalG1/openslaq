import type { IntegrationPlugin } from "../types";
import webhookRoutes from "./webhook-routes";
import setupRoutes from "./setup-routes";
import { handleSentry } from "./slash-command";

export const sentryPlugin: IntegrationPlugin = {
  slug: "sentry-bot",
  webhookRoutes,
  setupRoutes,
  slashCommand: {
    definition: {
      name: "sentry",
      description: "Manage Sentry project subscriptions",
      usage: "/sentry subscribe PROJECT-SLUG [events]",
      source: "integration",
    },
    handler: handleSentry,
  },
  botSlashCommands: [
    {
      name: "sentry",
      description: "Manage Sentry project subscriptions",
      usage: "/sentry subscribe PROJECT-SLUG [events]",
    },
  ],
};
