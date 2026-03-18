import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";

export async function getFeatureFlags(
  deps: ApiDeps,
  workspaceSlug: string,
): Promise<WorkspaceFeatureFlags> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"]["feature-flags"].$get(
        { param: { slug: workspaceSlug } },
        { headers },
      ),
    );
    return (await response.json()) as WorkspaceFeatureFlags;
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}
