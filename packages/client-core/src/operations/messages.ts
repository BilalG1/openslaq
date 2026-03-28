import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import { normalizeCursor, normalizeMessage, type RawMessage } from "./normalize";
import type { OperationDeps } from "./types";

interface LoadChannelMessagesParams {
  workspaceSlug: string;
  channelId: string;
}

export async function loadChannelMessages(
  deps: OperationDeps,
  params: LoadChannelMessagesParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, channelId } = params;

  dispatch({ type: "channel/loadStart", channelId });

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages.$get(
        { param: { slug, id: channelId }, query: {} },
        { headers },
      ),
    );
    const data = await response.json();
    dispatch({
      type: "channel/setMessages",
      channelId,
      messages: data.messages.map((m) => normalizeMessage(m as RawMessage)).reverse(),
      olderCursor: normalizeCursor(data.nextCursor),
      newerCursor: null,
      hasOlder: normalizeCursor(data.nextCursor) !== null,
      hasNewer: false,
    });
  } catch (err) {
    if (err instanceof AuthError) return;
    dispatch({
      type: "channel/loadError",
      channelId,
      error: getErrorMessage(err, "Failed to load messages"),
    });
  }
}

interface LoadOlderMessagesParams {
  workspaceSlug: string;
  channelId: string;
  cursor: string;
}

export async function loadOlderMessages(
  deps: OperationDeps,
  params: LoadOlderMessagesParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, channelId, cursor } = params;

  dispatch({ type: "channel/setLoadingOlder", channelId, loading: true });

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages.$get(
        {
          param: { slug, id: channelId },
          query: { cursor, direction: "older" },
        },
        { headers },
      ),
    );
    const data = await response.json();
    dispatch({
      type: "channel/prependMessages",
      channelId,
      messages: data.messages.map((m) => normalizeMessage(m as RawMessage)).reverse(),
      olderCursor: normalizeCursor(data.nextCursor),
      hasOlder: normalizeCursor(data.nextCursor) !== null,
    });
  } catch (err) {
    dispatch({ type: "channel/setLoadingOlder", channelId, loading: false });
    if (err instanceof AuthError) return;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to load older messages") });
  }
}

interface LoadNewerMessagesParams {
  workspaceSlug: string;
  channelId: string;
  cursor: string;
}

export async function loadNewerMessages(
  deps: OperationDeps,
  params: LoadNewerMessagesParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, channelId, cursor } = params;

  dispatch({ type: "channel/setLoadingNewer", channelId, loading: true });

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages.$get(
        {
          param: { slug, id: channelId },
          query: { cursor, direction: "newer" },
        },
        { headers },
      ),
    );
    const data = await response.json();
    dispatch({
      type: "channel/appendMessages",
      channelId,
      messages: data.messages.map((m) => normalizeMessage(m as RawMessage)),
      newerCursor: normalizeCursor(data.nextCursor),
      hasNewer: normalizeCursor(data.nextCursor) !== null,
    });
  } catch (err) {
    dispatch({ type: "channel/setLoadingNewer", channelId, loading: false });
    if (err instanceof AuthError) return;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to load newer messages") });
  }
}
