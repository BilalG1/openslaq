import type { AllUnreadsResponse } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { OperationDeps } from "./types";

export async function fetchAllUnreads(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<AllUnreadsResponse> {
  const { api, auth } = deps;
  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].unreads.$get(
      { param: { slug: params.workspaceSlug } },
      { headers },
    ),
  );
  return (await res.json()) as AllUnreadsResponse;
}

export async function markAllAsRead(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<void> {
  const { api, auth, dispatch } = deps;
  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].unreads["mark-all-read"].$post(
      { param: { slug: params.workspaceSlug } },
      { headers },
    ),
  );
  dispatch({ type: "unread/setCounts", counts: {} });
}
