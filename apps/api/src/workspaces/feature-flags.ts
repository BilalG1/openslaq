import { eq } from "drizzle-orm";
import { db } from "../db";
import { workspaces } from "./schema";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";

export const PLUGIN_SLUG_TO_FLAG: Record<string, keyof WorkspaceFeatureFlags> = {
  "github-bot": "integrationGithub",
  "linear-bot": "integrationLinear",
  "sentry-bot": "integrationSentry",
  "vercel-bot": "integrationVercel",
};

export async function getFeatureFlags(workspaceId: string): Promise<WorkspaceFeatureFlags> {
  const [row] = await db
    .select({
      integrationGithub: workspaces.integrationGithub,
      integrationLinear: workspaces.integrationLinear,
      integrationSentry: workspaces.integrationSentry,
      integrationVercel: workspaces.integrationVercel,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!row) throw new Error("Workspace not found");
  return row;
}

export async function updateFeatureFlags(
  workspaceId: string,
  flags: Partial<WorkspaceFeatureFlags>,
): Promise<WorkspaceFeatureFlags> {
  const update: Record<string, boolean> = {};
  if (flags.integrationGithub !== undefined) update.integrationGithub = flags.integrationGithub;
  if (flags.integrationLinear !== undefined) update.integrationLinear = flags.integrationLinear;
  if (flags.integrationSentry !== undefined) update.integrationSentry = flags.integrationSentry;
  if (flags.integrationVercel !== undefined) update.integrationVercel = flags.integrationVercel;

  if (Object.keys(update).length > 0) {
    await db.update(workspaces).set(update).where(eq(workspaces.id, workspaceId));
  }

  return getFeatureFlags(workspaceId);
}

export async function isIntegrationEnabled(workspaceId: string, pluginSlug: string): Promise<boolean> {
  const flagKey = PLUGIN_SLUG_TO_FLAG[pluginSlug];
  if (!flagKey) return true; // Not a gated integration
  const flags = await getFeatureFlags(workspaceId);
  return flags[flagKey];
}
