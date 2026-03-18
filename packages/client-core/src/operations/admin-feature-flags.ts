import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";

export async function getAdminFeatureFlags(
  deps: ApiDeps,
  workspaceId: string,
): Promise<WorkspaceFeatureFlags> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.admin.workspaces[":workspaceId"]["feature-flags"].$get(
        { param: { workspaceId } },
        { headers },
      ),
    );
    return (await response.json()) as WorkspaceFeatureFlags;
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function updateAdminFeatureFlags(
  deps: ApiDeps,
  workspaceId: string,
  flags: Partial<WorkspaceFeatureFlags>,
): Promise<WorkspaceFeatureFlags> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch(
        { param: { workspaceId }, json: flags },
        { headers },
      ),
    );
    return (await response.json()) as WorkspaceFeatureFlags;
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function bulkUpdateFeatureFlag(
  deps: ApiDeps,
  flag: keyof WorkspaceFeatureFlags,
  enabled: boolean,
): Promise<{ updated: number }> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.admin["feature-flags"].bulk.$post(
        { json: { flag, enabled } },
        { headers },
      ),
    );
    return (await response.json()) as { updated: number };
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}
