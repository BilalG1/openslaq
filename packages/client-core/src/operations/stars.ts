import { authorizedRequest } from "../api/api-client";
import type { OperationDeps } from "./types";

export async function fetchStarredChannels(
  deps: OperationDeps,
  slug: string,
): Promise<string[]> {
  const { api, auth, dispatch } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels.starred.$get(
      { param: { slug } },
      { headers },
    ),
  );
  const ids = await res.json();
  dispatch({ type: "stars/set", channelIds: ids });
  return ids;
}

interface StarParams {
  slug: string;
  channelId: string;
}

export async function starChannel(
  deps: OperationDeps,
  params: StarParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { slug, channelId } = params;

  // Optimistic
  dispatch({ type: "stars/add", channelId });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].star.$post(
        { param: { slug, id: channelId } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({ type: "stars/remove", channelId });
  }
}

export async function unstarChannel(
  deps: OperationDeps,
  params: StarParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { slug, channelId } = params;

  // Optimistic
  dispatch({ type: "stars/remove", channelId });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].star.$delete(
        { param: { slug, id: channelId } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({ type: "stars/add", channelId });
  }
}
