import type { WorkspaceInvite } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export async function listInvites(
  deps: ApiDeps,
  slug: string,
): Promise<WorkspaceInvite[]> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].invites.$get({ param: { slug } }, { headers }),
  );
  return (await response.json()) as WorkspaceInvite[];
}

export async function createInvite(
  deps: ApiDeps,
  slug: string,
  opts?: { maxUses?: number; expiresInHours?: number },
): Promise<WorkspaceInvite> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].invites.$post(
      { param: { slug }, json: opts ?? {} },
      { headers },
    ),
  );
  return (await response.json()) as WorkspaceInvite;
}

export async function revokeInvite(
  deps: ApiDeps,
  slug: string,
  inviteId: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].invites[":inviteId"].$delete(
      { param: { slug, inviteId } },
      { headers },
    ),
  );
}
