import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import { normalizeCursor, normalizeMessage, type RawMessage } from "./normalize";
import type { OperationDeps } from "./types";

interface LoadThreadMessagesParams {
  workspaceSlug: string;
  channelId: string;
  parentMessageId: string;
}

export async function loadThreadMessages(
  deps: OperationDeps,
  params: LoadThreadMessagesParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, channelId, parentMessageId } = params;

  dispatch({ type: "thread/loadStart", parentMessageId });

  try {
    const [parentRes, repliesRes] = await Promise.all([
      authorizedRequest(auth, (headers) =>
        api.api.messages[":id"].$get({ param: { id: parentMessageId } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get(
          { param: { slug, id: channelId, messageId: parentMessageId }, query: {} },
          { headers },
        ),
      ),
    ]);

    const parentData = await parentRes.json();
    const repliesData = await repliesRes.json();

    if (!("id" in parentData)) {
      dispatch({ type: "thread/loadError", parentMessageId, error: "Thread not found" });
      return;
    }

    // API returns newest-first (direction=older default) — reverse to chronological for display
    const replies = repliesData.messages.map((m) => normalizeMessage(m as RawMessage)).reverse();

    dispatch({
      type: "thread/setData",
      parent: normalizeMessage(parentData as RawMessage),
      replies,
      olderCursor: normalizeCursor(repliesData.nextCursor),
      hasOlder: normalizeCursor(repliesData.nextCursor) !== null,
    });
  } catch (err) {
    if (err instanceof AuthError) return;
    dispatch({
      type: "thread/loadError",
      parentMessageId,
      error: getErrorMessage(err, "Failed to load thread"),
    });
  }
}

interface LoadOlderRepliesParams {
  workspaceSlug: string;
  channelId: string;
  parentMessageId: string;
  cursor: string;
}

export async function loadOlderReplies(
  deps: OperationDeps,
  params: LoadOlderRepliesParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, channelId, parentMessageId, cursor } = params;

  dispatch({ type: "thread/setLoadingOlder", parentMessageId, loading: true });

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get(
        {
          param: { slug, id: channelId, messageId: parentMessageId },
          query: { cursor, direction: "older" },
        },
        { headers },
      ),
    );
    const data = await response.json();
    // API returns newest-first (desc) — reverse to chronological for prepend
    dispatch({
      type: "thread/prependReplies",
      parentMessageId,
      replies: data.messages.map((m) => normalizeMessage(m as RawMessage)).reverse(),
      olderCursor: normalizeCursor(data.nextCursor),
      hasOlder: normalizeCursor(data.nextCursor) !== null,
    });
  } catch (err) {
    dispatch({ type: "thread/setLoadingOlder", parentMessageId, loading: false });
    if (err instanceof AuthError) return;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to load older replies") });
  }
}

// Keep loadMoreReplies as an alias for backwards compatibility during transition
export const loadMoreReplies = loadOlderReplies;

export interface UserThreadItem {
  message: import("@openslaq/shared").Message;
  channelName: string;
}

export async function fetchUserThreads(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<UserThreadItem[]> {
  const { api, auth } = deps;
  const { workspaceSlug } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].threads.$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const data = (await res.json()) as { threads: Array<{ message: RawMessage; channelName: string }> };
  return data.threads.map((item) => ({
    message: normalizeMessage(item.message),
    channelName: item.channelName,
  }));
}
