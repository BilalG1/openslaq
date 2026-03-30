import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { featureFlags } from "./feature-flags-schema";
import {
  PLUGIN_SLUG_TO_FLAG,
  getFeatureFlagDefaults,
  isValidFlagValue,
  isFeatureFlagKey,
  type WorkspaceFeatureFlags,
} from "@openslaq/shared";
import { BadRequestError } from "../errors";

export { PLUGIN_SLUG_TO_FLAG };

export async function getFeatureFlags(workspaceId: string): Promise<WorkspaceFeatureFlags> {
  const rows = await db
    .select({ key: featureFlags.key, value: featureFlags.value })
    .from(featureFlags)
    .where(eq(featureFlags.workspaceId, workspaceId));

  const flags = getFeatureFlagDefaults();
  for (const row of rows) {
    if (isFeatureFlagKey(row.key)) {
      flags[row.key] = row.value;
    }
  }
  return flags;
}

export async function updateFeatureFlags(
  workspaceId: string,
  updates: Partial<WorkspaceFeatureFlags>,
): Promise<WorkspaceFeatureFlags> {
  for (const [key, value] of Object.entries(updates)) {
    if (!isFeatureFlagKey(key)) {
      throw new BadRequestError(`Unknown feature flag: ${key}`);
    }
    if (value === undefined || !isValidFlagValue(key, value)) {
      throw new BadRequestError(`Invalid value "${value}" for feature flag "${key}"`);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(featureFlags)
      .values({ workspaceId, key, value: value as string })
      .onConflictDoUpdate({
        target: [featureFlags.workspaceId, featureFlags.key],
        set: { value: value as string, updatedAt: new Date() },
      });
  }

  return getFeatureFlags(workspaceId);
}

export async function bulkUpdateFeatureFlag(
  flag: string,
  value: string,
): Promise<number> {
  if (!isFeatureFlagKey(flag)) {
    throw new BadRequestError(`Unknown feature flag: ${flag}`);
  }
  if (!isValidFlagValue(flag, value)) {
    throw new BadRequestError(`Invalid value "${value}" for feature flag "${flag}"`);
  }

  const result = await db.execute<{ count: number }>(sql`
    WITH upserted AS (
      INSERT INTO feature_flags (workspace_id, key, value)
      SELECT id, ${flag}, ${value} FROM workspaces
      ON CONFLICT (workspace_id, key) DO UPDATE SET value = ${value}, updated_at = now()
      RETURNING 1
    )
    SELECT count(*)::int AS count FROM upserted
  `);
  return result[0]?.count ?? 0;
}

export async function isIntegrationEnabled(workspaceId: string, pluginSlug: string): Promise<boolean> {
  const flagKey = PLUGIN_SLUG_TO_FLAG[pluginSlug];
  if (!flagKey) return true; // Not a gated integration
  const flags = await getFeatureFlags(workspaceId);
  return flags[flagKey] === "true";
}
