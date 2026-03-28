import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";

export async function getFeatureFlags(
  deps: ApiDeps,
  workspaceSlug: string,
): Promise<WorkspaceFeatureFlags> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["feature-flags"].$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  return (await response.json()) as WorkspaceFeatureFlags;
}
