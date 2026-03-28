import type { Message, ChannelNotifyLevel } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import { getErrorMessage } from "../api/errors";
import type { ChatAction } from "../chat-reducer";
import type { OperationDeps } from "./types";

interface UnreadContext {
  currentUserId: string;
  activeChannelId: string | null;
  activeDmId: string | null;
  activeGroupDmId?: string | null;
  channelNotificationPrefs?: Record<string, ChannelNotifyLevel>;
}

export function handleNewMessageUnread(
  message: Message,
  ctx: UnreadContext,
): ChatAction | null {
  // Only count top-level messages (not thread replies)
  if (message.parentMessageId) return null;

  // Don't count own messages as unread
  if (message.userId === ctx.currentUserId) return null;

  // Only increment if the message is for a non-active channel
  const activeId = ctx.activeChannelId ?? ctx.activeDmId ?? ctx.activeGroupDmId;
  if (message.channelId === activeId) return null;

  // Respect per-channel notification preferences
  const pref = ctx.channelNotificationPrefs?.[message.channelId] ?? "all";
  if (pref === "muted") return null;
  if (pref === "mentions") {
    const isMentioned = message.mentions?.some(
      (m) => m.userId === ctx.currentUserId || m.type === "here" || m.type === "channel",
    ) ?? false;
    if (!isMentioned) return null;
  }

  return { type: "unread/increment", channelId: message.channelId };
}

interface MarkAsReadParams {
  workspaceSlug: string;
  channelId: string;
}

export async function markChannelAsRead(
  deps: OperationDeps,
  params: MarkAsReadParams,
): Promise<void> {
  const { api, auth } = deps;
  const { workspaceSlug: slug, channelId } = params;

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].read.$post(
        { param: { slug, id: channelId } },
        { headers },
      ),
    );
  } catch { }
}

interface MarkAsUnreadParams {
  workspaceSlug: string;
  channelId: string;
  messageId: string;
}

export async function markChannelAsUnread(
  deps: OperationDeps,
  params: MarkAsUnreadParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, channelId, messageId } = params;

  // Suppress auto-mark-as-read before API call
  dispatch({ type: "unread/suppressAutoRead", channelId });

  try {
    const res = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"]["mark-unread"].$post(
        { param: { slug, id: channelId }, json: { messageId } },
        { headers },
      ),
    );
    const body = (await res.clone().json()) as { ok: boolean; unreadCount: number };
    dispatch({ type: "unread/setCount", channelId, count: body.unreadCount });
  } catch (err) {
    // Lift suppress so auto-read resumes, and surface the error
    dispatch({ type: "unread/liftSuppressAutoRead", channelId });
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to mark as unread") });
  }
}
