import { authorizedRequest } from "../api/api-client";
import type { OperationDeps } from "./types";

export interface DraftItem {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  parentMessageId: string | null;
  updatedAt: string;
  createdAt: string;
  channelName: string;
}

export async function fetchDrafts(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<DraftItem[]> {
  const { api, auth } = deps;
  const { workspaceSlug } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].drafts.$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const data = (await res.json()) as { drafts: DraftItem[] };
  return data.drafts;
}

export async function upsertDraftOp(
  deps: OperationDeps,
  params: {
    workspaceSlug: string;
    channelId: string;
    content: string;
    parentMessageId?: string;
  },
): Promise<DraftItem> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId, content, parentMessageId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].drafts.$put(
      {
        param: { slug: workspaceSlug },
        json: { channelId, content, ...(parentMessageId ? { parentMessageId } : {}) },
      },
      { headers },
    ),
  );
  return (await res.json()) as DraftItem;
}

export async function deleteDraftOp(
  deps: OperationDeps,
  params: { workspaceSlug: string; id: string },
): Promise<void> {
  const { api, auth } = deps;
  const { workspaceSlug, id } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].drafts[":id"].$delete(
      { param: { slug: workspaceSlug, id } },
      { headers },
    ),
  );
}

export async function deleteDraftByKeyOp(
  deps: OperationDeps,
  params: {
    workspaceSlug: string;
    channelId: string;
    parentMessageId?: string;
  },
): Promise<void> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId, parentMessageId } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].drafts["by-key"].$delete(
      {
        param: { slug: workspaceSlug },
        query: { channelId, ...(parentMessageId ? { parentMessageId } : {}) },
      },
      { headers },
    ),
  );
}

export async function fetchDraftForChannel(
  deps: OperationDeps,
  params: {
    workspaceSlug: string;
    channelId: string;
    parentMessageId?: string;
  },
): Promise<DraftItem | null> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId, parentMessageId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].drafts.channel[":channelId"].$get(
      {
        param: { slug: workspaceSlug, channelId },
        query: parentMessageId ? { parentMessageId } : {},
      },
      { headers },
    ),
  );
  const data = (await res.json()) as { draft: DraftItem | null };
  return data.draft;
}
