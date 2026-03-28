import type { Message, Attachment, ReactionGroup } from "@openslaq/shared";
import { asUserId, asMessageId, asChannelId, asAttachmentId } from "@openslaq/shared";
import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { OperationDeps } from "./types";

interface ToggleReactionParams {
  messageId: string;
  emoji: string;
  userId: string;
}

export async function toggleReaction(
  deps: OperationDeps,
  params: ToggleReactionParams,
): Promise<void> {
  const { api, auth, dispatch, getState } = deps;
  const { messageId, emoji, userId } = params;

  const state = getState();
  const existing = state.messagesById[messageId];
  const previousReactions: ReactionGroup[] = existing?.reactions ?? [];

  if (existing) {
    const currentUserId = asUserId(userId);
    const current = previousReactions.find((group) => group.emoji === emoji);
    let nextReactions: ReactionGroup[];

    if (!current) {
      nextReactions = [...previousReactions, { emoji, count: 1, userIds: [currentUserId] }];
    } else {
      const hasReacted = current.userIds.includes(currentUserId);
      if (hasReacted) {
        const nextUserIds = current.userIds.filter((id) => id !== currentUserId);
        nextReactions =
          nextUserIds.length === 0
            ? previousReactions.filter((group) => group.emoji !== emoji)
            : previousReactions.map((group) =>
                group.emoji === emoji
                  ? { ...group, userIds: nextUserIds, count: Math.max(0, group.count - 1) }
                  : group,
              );
      } else {
        nextReactions = previousReactions.map((group) =>
          group.emoji === emoji
            ? { ...group, userIds: [...group.userIds, currentUserId], count: group.count + 1 }
            : group,
        );
      }
    }

    dispatch({ type: "messages/updateReactions", messageId, reactions: nextReactions });
  }

  try {
    dispatch({ type: "mutations/error", error: null });
    await authorizedRequest(auth, (headers) =>
      api.api.messages[":id"].reactions.$post(
        { param: { id: messageId }, json: { emoji } },
        { headers },
      ),
    );
  } catch (err) {
    if (err instanceof AuthError) return;

    if (existing) {
      dispatch({ type: "messages/updateReactions", messageId, reactions: previousReactions });
    }
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to update reaction") });
  }
}

/** Minimal file metadata for optimistic attachment placeholders */
export interface PendingAttachmentInfo {
  id: string;
  filename: string;
  mimeType: string;
}

interface SendMessageParams {
  channelId: string;
  workspaceSlug: string;
  content: string;
  attachmentIds?: string[];
  /** File metadata for optimistic placeholders — keeps layout stable when the real message arrives */
  pendingAttachments?: PendingAttachmentInfo[];
  parentMessageId?: string | null;
  /** Required for optimistic update */
  userId?: string;
  /** Display name shown on optimistic message */
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
}

export async function sendMessage(
  deps: OperationDeps,
  params: SendMessageParams,
): Promise<boolean> {
  const { api, auth, dispatch } = deps;
  const { channelId, workspaceSlug, content, attachmentIds = [], pendingAttachments = [], parentMessageId, userId, senderDisplayName } = params;

  // Create optimistic message if we have the user info
  let tempId: string | null = null;
  if (userId) {
    tempId = `optimistic-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Build placeholder attachments so the message renders at the correct height
    const optimisticAttachments: Attachment[] = pendingAttachments.map((f) => ({
      id: asAttachmentId(f.id),
      messageId: null,
      filename: f.filename,
      mimeType: f.mimeType,
      size: 0,
      uploadedBy: asUserId(userId),
      createdAt: timestamp,
      downloadUrl: "",
    }));

    const optimistic: Message = {
      id: asMessageId(tempId),
      channelId: asChannelId(channelId),
      userId: asUserId(userId),
      content,
      parentMessageId: parentMessageId ? asMessageId(parentMessageId) : null,
      replyCount: 0,
      latestReplyAt: null,
      attachments: optimisticAttachments,
      reactions: [],
      mentions: [],
      senderDisplayName: senderDisplayName ?? undefined,
      senderAvatarUrl: params.senderAvatarUrl ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    dispatch({ type: "messages/upsert", message: optimistic });
  }

  try {
    dispatch({ type: "mutations/error", error: null });
    let response;
    if (parentMessageId) {
      response = await authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post(
          {
            param: { slug: workspaceSlug, id: channelId, messageId: parentMessageId },
            json: { content, attachmentIds },
          },
          { headers },
        ),
      );
    } else {
      response = await authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages.$post(
          {
            param: { slug: workspaceSlug, id: channelId },
            json: { content, attachmentIds },
          },
          { headers },
        ),
      );
    }

    const message = (await response.json()) as Message;
    if (tempId) {
      dispatch({ type: "messages/replaceOptimistic", tempId, message });
    } else {
      dispatch({ type: "messages/upsert", message });
    }

    return true;
  } catch (err) {
    // Remove optimistic message on failure
    if (tempId) {
      dispatch({ type: "messages/delete", messageId: tempId, channelId });
    }
    if (err instanceof AuthError) return false;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to send message") });
    return false;
  }
}

export async function editMessage(
  deps: OperationDeps,
  params: { messageId: string; content: string },
): Promise<void> {
  const { api, auth, dispatch, getState } = deps;
  const previousMessage = getState().messagesById[params.messageId];

  // Optimistic update
  if (previousMessage) {
    dispatch({
      type: "messages/upsert",
      message: { ...previousMessage, content: params.content, updatedAt: new Date().toISOString() },
    });
  }

  try {
    dispatch({ type: "mutations/error", error: null });
    const response = await authorizedRequest(auth, (headers) =>
      api.api.messages[":id"].$put(
        { param: { id: params.messageId }, json: { content: params.content } },
        { headers },
      ),
    );

    const message = (await response.json()) as Message;
    dispatch({ type: "messages/upsert", message });
  } catch (err) {
    // Rollback optimistic update
    if (previousMessage) {
      dispatch({ type: "messages/upsert", message: previousMessage });
    }
    if (err instanceof AuthError) return;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to edit message") });
  }
}

export async function deleteMessage(
  deps: OperationDeps,
  params: { messageId: string },
): Promise<void> {
  const { api, auth, dispatch, getState } = deps;
  const previousMessage = getState().messagesById[params.messageId];

  // Optimistic delete
  if (previousMessage) {
    dispatch({ type: "messages/delete", messageId: params.messageId, channelId: previousMessage.channelId });
  }

  try {
    dispatch({ type: "mutations/error", error: null });
    await authorizedRequest(auth, (headers) =>
      api.api.messages[":id"].$delete(
        { param: { id: params.messageId } },
        { headers },
      ),
    );
  } catch (err) {
    // Rollback: restore the deleted message
    if (previousMessage) {
      dispatch({ type: "messages/upsert", message: previousMessage });
    }
    if (err instanceof AuthError) return;
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to delete message") });
  }
}
