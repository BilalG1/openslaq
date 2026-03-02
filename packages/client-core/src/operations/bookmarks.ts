import { authorizedRequest } from "../api/api-client";
import type { ChannelBookmark } from "@openslaq/shared";
import type { OperationDeps } from "./types";

export async function fetchBookmarks(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string },
): Promise<ChannelBookmark[]> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].bookmarks.$get(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );
  const data = (await res.json()) as { bookmarks: ChannelBookmark[] };
  dispatch({ type: "bookmarks/set", channelId, bookmarks: data.bookmarks });
  return data.bookmarks;
}

export async function addBookmarkOp(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string; url: string; title: string },
): Promise<void> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId, url, title } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].bookmarks.$post(
      { param: { slug: workspaceSlug, id: channelId }, json: { url, title } },
      { headers },
    ),
  );
  // Socket event handles state update
}

export async function removeBookmarkOp(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string; bookmarkId: string },
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, bookmarkId } = params;

  // Optimistic removal
  dispatch({ type: "bookmarks/remove", channelId, bookmarkId });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookmarksClient = api.api.workspaces[":slug"].channels[":id"].bookmarks as any;
    await authorizedRequest(auth, (headers) =>
      bookmarksClient[":bookmarkId"].$delete(
        { param: { slug: workspaceSlug, id: channelId, bookmarkId } },
        { headers },
      ),
    );
  } catch {
    // Rollback: re-fetch bookmarks to restore correct state
    try {
      const res = await authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].bookmarks.$get(
          { param: { slug: workspaceSlug, id: channelId } },
          { headers },
        ),
      );
      const data = (await res.json()) as { bookmarks: import("@openslaq/shared").ChannelBookmark[] };
      dispatch({ type: "bookmarks/set", channelId, bookmarks: data.bookmarks });
    } catch {
      // If rollback also fails, state may be stale
    }
  }
}
