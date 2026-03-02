import { authorizedRequest } from "../api/api-client";
import type { FileBrowserItem, FileCategory } from "@openslaq/shared";
import type { ApiDeps } from "./types";

export interface FetchFilesParams {
  workspaceSlug: string;
  channelId?: string;
  category?: FileCategory;
  cursor?: string;
  limit?: number;
}

export interface FetchFilesResult {
  files: FileBrowserItem[];
  nextCursor: string | null;
}

export async function fetchFiles(
  deps: ApiDeps,
  params: FetchFilesParams,
): Promise<FetchFilesResult> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId, category, cursor, limit } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].files.$get(
      {
        param: { slug: workspaceSlug },
        query: { channelId, category, cursor, limit },
      },
      { headers },
    ),
  );
  return (await res.json()) as FetchFilesResult;
}
