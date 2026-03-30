import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { WorkspaceFeatureFlags, FeatureFlagKey } from "@openslaq/shared";

export async function getAdminFeatureFlags(
  deps: ApiDeps,
  workspaceId: string,
): Promise<WorkspaceFeatureFlags> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.admin.workspaces[":workspaceId"]["feature-flags"].$get(
      { param: { workspaceId } },
      { headers },
    ),
  );
  return (await response.json()) as WorkspaceFeatureFlags;
}

export async function updateAdminFeatureFlags(
  deps: ApiDeps,
  workspaceId: string,
  flags: Partial<WorkspaceFeatureFlags>,
): Promise<WorkspaceFeatureFlags> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch(
      { param: { workspaceId }, json: flags },
      { headers },
    ),
  );
  return (await response.json()) as WorkspaceFeatureFlags;
}

export async function bulkUpdateFeatureFlag(
  deps: ApiDeps,
  flag: FeatureFlagKey,
  value: string,
): Promise<{ updated: number }> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.admin["feature-flags"].bulk.$post(
      { json: { flag, value } },
      { headers },
    ),
  );
  return (await response.json()) as { updated: number };
}
