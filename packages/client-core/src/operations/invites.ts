import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export async function getInvite(
  deps: ApiDeps,
  code: string,
): Promise<{ workspaceName: string; workspaceSlug: string; alreadyMember: boolean }> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.invites[":code"].$get({ param: { code } }, { headers }),
  );
  return (await response.json()) as { workspaceName: string; workspaceSlug: string; alreadyMember: boolean };
}

export async function acceptInvite(
  deps: ApiDeps,
  code: string,
): Promise<{ slug: string }> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.invites[":code"].accept.$post({ param: { code } }, { headers }),
  );
  return (await response.json()) as { slug: string };
}
