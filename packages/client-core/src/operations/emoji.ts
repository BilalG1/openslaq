import { authorizedRequest } from "../api/api-client";
import type { CustomEmoji } from "@openslaq/shared";
import type { OperationDeps } from "./types";

export async function fetchCustomEmojis(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<CustomEmoji[]> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].emoji.$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const data = (await res.json()) as { emojis: CustomEmoji[] };
  dispatch({ type: "emoji/set", emojis: data.emojis });
  return data.emojis;
}

export async function uploadCustomEmoji(
  deps: OperationDeps,
  params: { workspaceSlug: string; name: string; file: File },
): Promise<CustomEmoji> {
  const { auth, dispatch } = deps;
  const { workspaceSlug, name, file } = params;

  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);

  const token = await auth.requireAccessToken();
  const res = await fetch(`/api/workspaces/${workspaceSlug}/emoji`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error);
  }

  const data = (await res.json()) as { emoji: CustomEmoji };
  dispatch({ type: "emoji/add", emoji: data.emoji });
  return data.emoji;
}

export async function deleteCustomEmoji(
  deps: OperationDeps,
  params: { workspaceSlug: string; emojiId: string },
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, emojiId } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].emoji[":emojiId"].$delete(
      { param: { slug: workspaceSlug, emojiId } },
      { headers },
    ),
  );
  dispatch({ type: "emoji/remove", emojiId });
}
