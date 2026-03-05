import { authorizedRequest } from "../api/api-client";
import { normalizeMessage } from "./normalize";
import type { Message } from "@openslaq/shared";
import type { OperationDeps } from "./types";

interface PinParams {
  workspaceSlug: string;
  channelId: string;
  messageId: string;
}

export async function pinMessage(
  deps: OperationDeps,
  params: PinParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, messageId } = params;

  // Optimistic
  dispatch({
    type: "messages/updatePinStatus",
    messageId,
    isPinned: true,
  });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post(
        { param: { slug: workspaceSlug, id: channelId, messageId } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({
      type: "messages/updatePinStatus",
      messageId,
      isPinned: false,
    });
  }
}

export async function unpinMessage(
  deps: OperationDeps,
  params: PinParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, messageId } = params;

  // Optimistic
  dispatch({
    type: "messages/updatePinStatus",
    messageId,
    isPinned: false,
  });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$delete(
        { param: { slug: workspaceSlug, id: channelId, messageId } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({
      type: "messages/updatePinStatus",
      messageId,
      isPinned: true,
    });
  }
}

export async function fetchPinnedMessageCount(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string },
): Promise<number> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"]["pin-count"].$get(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function fetchPinnedMessages(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string },
): Promise<Message[]> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].pins.$get(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );
  const data = (await res.json()) as { messages: unknown[] };
  return data.messages.map(
    (m) => normalizeMessage(m as unknown as Parameters<typeof normalizeMessage>[0]),
  );
}
