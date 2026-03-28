import type { Workspace, Role } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export interface WorkspaceListItem extends Workspace {
  role: Role;
  memberCount: number;
}

export async function listWorkspaces(deps: ApiDeps): Promise<WorkspaceListItem[]> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces.$get({}, { headers }),
  );
  return (await response.json()) as WorkspaceListItem[];
}

export async function createWorkspace(
  deps: ApiDeps,
  name: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { api, auth } = deps;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces.$post({ json: { name } }, { headers }),
    );
    const data = (await response.json()) as { slug: string };
    return { ok: true, slug: data.slug };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Failed to create workspace" };
  }
}
