import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export interface WorkspaceMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  joinedAt: string;
}

export async function listWorkspaceMembers(
  deps: ApiDeps,
  slug: string,
): Promise<WorkspaceMember[]> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].members.$get({ param: { slug }, query: {} }, { headers }),
  );
  return (await response.json()) as WorkspaceMember[];
}

export async function updateMemberRole(
  deps: ApiDeps,
  slug: string,
  userId: string,
  role: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].members[":userId"].role.$patch(
      { param: { slug, userId }, json: { role: role as "member" | "admin" } },
      { headers },
    ),
  );
}

export async function removeMember(
  deps: ApiDeps,
  slug: string,
  userId: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].members[":userId"].$delete(
      { param: { slug, userId } },
      { headers },
    ),
  );
}

export async function leaveWorkspace(
  deps: ApiDeps,
  slug: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].members.leave.$post(
      { param: { slug } },
      { headers },
    ),
  );
}

export async function deleteWorkspace(
  deps: ApiDeps,
  slug: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].$delete({ param: { slug } }, { headers }),
  );
}
