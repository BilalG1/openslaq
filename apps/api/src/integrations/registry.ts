import type { IntegrationPlugin } from "./types";
import { githubPlugin } from "./github/plugin";
import { linearPlugin } from "./linear/plugin";
import { sentryPlugin } from "./sentry/plugin";
import { vercelPlugin } from "./vercel/plugin";

export const INTEGRATION_PLUGINS: IntegrationPlugin[] = [githubPlugin, linearPlugin, sentryPlugin, vercelPlugin];

export function getPluginBySlug(slug: string): IntegrationPlugin | undefined {
  return INTEGRATION_PLUGINS.find((p) => p.slug === slug);
}

export function getInternalBotSlugs(): string[] {
  return INTEGRATION_PLUGINS.map((p) => p.slug);
}
