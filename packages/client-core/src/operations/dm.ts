import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { DmConversation } from "../chat-reducer";
import { normalizeDmConversation } from "./normalize";
import type { OperationDeps } from "./types";

interface CreateDmParams {
  workspaceSlug: string;
  targetUserId: string;
}

async function findOrCreateDmCore(
  deps: OperationDeps,
  params: CreateDmParams,
): Promise<DmConversation | null> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, targetUserId } = params;

  try {
    dispatch({ type: "mutations/error", error: null });
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].dm.$post(
        { param: { slug: workspaceSlug }, json: { userId: targetUserId } },
        { headers },
      ),
    );

    const data = await response.json();
    if (!("channel" in data)) {
      return null;
    }

    const { channel, otherUser } = data;
    if (!otherUser) {
      return null;
    }

    const newDm: DmConversation = normalizeDmConversation({ channel, otherUser });
    dispatch({ type: "workspace/addDm", dm: newDm });
    return newDm;
  } catch (err) {
    if (err instanceof AuthError) return null;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to create DM") });
    return null;
  }
}

export async function createDm(
  deps: OperationDeps,
  params: CreateDmParams,
): Promise<DmConversation | null> {
  const dm = await findOrCreateDmCore(deps, params);
  if (dm) {
    deps.dispatch({ type: "workspace/selectDm", channelId: dm.channel.id });
  }
  return dm;
}

export async function findOrCreateDmForCompose(
  deps: OperationDeps,
  params: CreateDmParams,
): Promise<DmConversation | null> {
  const dm = await findOrCreateDmCore(deps, params);
  if (dm) {
    deps.dispatch({ type: "compose/setPreviewChannel", channelId: dm.channel.id });
  }
  return dm;
}
