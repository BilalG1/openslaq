import { authorizedRequest } from "../api/api-client";
import { normalizeMessage, type RawMessage } from "./normalize";
import type { Message } from "@openslaq/shared";
import type { OperationDeps } from "./types";

interface ShareParams {
  workspaceSlug: string;
  destinationChannelId: string;
  sharedMessageId: string;
  comment: string;
}

export async function shareMessage(
  deps: OperationDeps,
  params: ShareParams,
): Promise<Message> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, destinationChannelId, sharedMessageId, comment } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].messages.share.$post(
      {
        param: { slug: workspaceSlug, id: destinationChannelId },
        json: { sharedMessageId, comment },
      },
      { headers },
    ),
  );

  const data = (await res.json()) as RawMessage;
  const message = normalizeMessage(data);

  dispatch({ type: "messages/upsert", message });

  return message;
}
