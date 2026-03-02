import { authorizedRequest } from "../api/api-client";
import { normalizeMessage } from "./normalize";
import type { Message } from "@openslaq/shared";
import type { OperationDeps } from "./types";

interface SaveParams {
  workspaceSlug: string;
  channelId: string;
  messageId: string;
}

export async function saveMessageOp(
  deps: OperationDeps,
  params: SaveParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, messageId } = params;

  // Optimistic
  dispatch({ type: "saved/add", messageId });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post(
        { param: { slug: workspaceSlug, id: channelId, messageId } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({ type: "saved/remove", messageId });
  }
}

export async function unsaveMessageOp(
  deps: OperationDeps,
  params: SaveParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, messageId } = params;

  // Optimistic
  dispatch({ type: "saved/remove", messageId });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$delete(
        { param: { slug: workspaceSlug, id: channelId, messageId } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({ type: "saved/add", messageId });
  }
}

export interface SavedMessageItem {
  message: Message;
  channelName: string;
  savedAt: string;
}

export async function fetchSavedMessages(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<SavedMessageItem[]> {
  const { api, auth } = deps;
  const { workspaceSlug } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["saved-messages"].$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const data = (await res.json()) as { messages: Array<{ message: unknown; channelName: string; savedAt: string }> };
  return data.messages.map((item) => ({
    message: normalizeMessage(item.message as Parameters<typeof normalizeMessage>[0]),
    channelName: item.channelName,
    savedAt: item.savedAt,
  }));
}

export async function fetchSavedMessageIds(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<string[]> {
  const { api, auth } = deps;
  const { workspaceSlug } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["saved-messages"].ids.$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const data = (await res.json()) as { messageIds: string[] };
  return data.messageIds;
}
