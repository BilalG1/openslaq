import type { HuddleState, ChannelId } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { ChatAction } from "../chat-reducer";
import type { ApiDeps } from "./types";

export function handleHuddleSync(payload: { huddles: HuddleState[] }): ChatAction {
  return { type: "huddle/sync", huddles: payload.huddles };
}

export function handleHuddleStarted(huddle: HuddleState): ChatAction {
  return { type: "huddle/started", huddle };
}

export function handleHuddleUpdated(huddle: HuddleState): ChatAction {
  return { type: "huddle/updated", huddle };
}

export function handleHuddleEnded(payload: { channelId: ChannelId }): ChatAction {
  return { type: "huddle/ended", channelId: payload.channelId };
}

export function setCurrentHuddleChannel(
  dispatch: (action: ChatAction) => void,
  channelId: string | null,
): void {
  dispatch({ type: "huddle/setCurrentChannel", channelId });
}

export async function notifyHuddleLeave(deps: ApiDeps): Promise<{ ended: boolean }> {
  try {
    const res = await authorizedRequest(deps.auth, (headers) =>
      deps.api.api.huddle.leave.$post({}, { headers }),
    );
    const body = (await res.json()) as { ended: boolean };
    return { ended: body.ended };
  } catch {
    return { ended: false };
  }
}
