/**
 * Set a feature flag for a workspace.
 *
 * Usage:
 *   bun run scripts/admin/set-flag.ts <workspace-slug> <flag-key> <flag-value>
 *   bun run scripts/admin/set-flag.ts default mobileMessageInput variant-a
 *
 * Requires `openslaq login` with an admin user.
 */

import { getAuthToken } from "../../apps/cli/src/client";
import { FEATURE_FLAG_REGISTRY, isFeatureFlagKey, isValidFlagValue } from "@openslaq/shared";

const API_URL = process.env.OPENSLAQ_API_URL ?? "https://api.openslaq.com";

const [slug, key, value] = process.argv.slice(2);

if (!slug || !key || !value) {
  console.error("Usage: bun run scripts/admin/set-flag.ts <workspace-slug> <flag-key> <flag-value>");
  console.error("\nAvailable flags:");
  for (const [k, v] of Object.entries(FEATURE_FLAG_REGISTRY)) {
    console.error(`  ${k}: ${(v.values as readonly string[]).join(" | ")} (default: ${v.default})`);
  }
  process.exit(1);
}

if (!isFeatureFlagKey(key)) {
  console.error(`Unknown flag: ${key}`);
  console.error(`Valid flags: ${Object.keys(FEATURE_FLAG_REGISTRY).join(", ")}`);
  process.exit(1);
}

if (!isValidFlagValue(key, value)) {
  const entry = FEATURE_FLAG_REGISTRY[key];
  console.error(`Invalid value "${value}" for flag "${key}"`);
  console.error(`Valid values: ${(entry.values as readonly string[]).join(", ")}`);
  process.exit(1);
}

const token = await getAuthToken();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Resolve workspace slug → ID
const wsRes = await fetch(`${API_URL}/api/admin/workspaces?page=1&pageSize=100&search=${encodeURIComponent(slug)}`, {
  headers,
});
if (!wsRes.ok) {
  if (wsRes.status === 403) {
    console.error("Access denied. Make sure you logged in with an admin user (`openslaq login`).");
  } else {
    console.error(`Failed to fetch workspaces: ${wsRes.status}`);
  }
  process.exit(1);
}
const wsData = (await wsRes.json()) as { workspaces: Array<{ id: string; slug: string }> };
const workspace = wsData.workspaces.find((w) => w.slug === slug);
if (!workspace) {
  console.error(`Workspace "${slug}" not found.`);
  process.exit(1);
}

// Update the flag
const res = await fetch(`${API_URL}/api/admin/workspaces/${workspace.id}/feature-flags`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ [key]: value }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`Failed to update flag: ${res.status} ${body}`);
  process.exit(1);
}

const flags = await res.json();
console.log(`Updated ${key} = "${value}" for workspace "${slug}"`);
console.log(flags);
