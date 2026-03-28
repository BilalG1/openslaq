import { useCallback } from "react";
import { useParams } from "react-router-dom";
import type { Attachment, Message, ReactionGroup } from "@openslaq/shared";
import { asChannelId, asMessageId, asUserId } from "@openslaq/shared";
import {
  toggleReaction as coreToggleReaction,
  sendMessage as coreSendMessage,
  editMessage as coreEditMessage,
  deleteMessage as coreDeleteMessage,
  markChannelAsUnread as coreMarkChannelAsUnread,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

interface AuthJsonUser {
  id: string;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

interface SendMessageInput {
  channelId: string;
  workspaceSlug: string;
  content: string;
  attachmentIds?: string[];
  attachments?: Attachment[];
  parentMessageId?: string | null;
}

export function useMessageMutations(user: AuthJsonUser | null | undefined) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;

      // Gallery: apply optimistic update locally but skip API call
      if (isGallery) {
        const existing = state.messagesById[messageId];
        if (existing) {
          const currentUserId = asUserId(user.id);
          const previousReactions: ReactionGroup[] = existing.reactions ?? [];
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
        return;
      }

      await coreToggleReaction({ api, auth, dispatch, getState: () => state }, { messageId, emoji, userId: user.id });
    },
    [auth, dispatch, isGallery, state, user],
  );

  const sendMessage = useCallback(
    async ({
      channelId,
      workspaceSlug,
      content,
      attachmentIds = [],
      attachments = [],
      parentMessageId,
    }: SendMessageInput) => {
      if (!user) return false;

      if (isGallery) {
        const timestamp = new Date().toISOString();
        const currentUserId = asUserId(user.id);
        const currentUserName = state.workspaces.length > 0 ? "You" : "Demo User";
        const nextMessage: Message = {
          id: asMessageId(`demo-msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
          channelId: asChannelId(channelId),
          userId: currentUserId,
          senderDisplayName: currentUserName,
          senderAvatarUrl: null,
          content,
          parentMessageId: parentMessageId ? asMessageId(parentMessageId) : null,
          replyCount: 0,
          latestReplyAt: null,
          attachments,
          reactions: [],
          mentions: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        dispatch({ type: "mutations/error", error: null });
        dispatch({ type: "messages/upsert", message: nextMessage });

        if (parentMessageId) {
          dispatch({
            type: "messages/updateThreadSummary",
            channelId: asChannelId(channelId),
            parentMessageId: asMessageId(parentMessageId),
            replyCount: (state.messagesById[parentMessageId]?.replyCount ?? 0) + 1,
            latestReplyAt: timestamp,
          });
        }

        // Showcase reactions after sending: spaced-out lightweight bot feedback.
        let stagedReactions: ReactionGroup[] = [];
        window.setTimeout(() => {
          stagedReactions = [...stagedReactions, { emoji: "\u{1F44D}", count: 1, userIds: [asUserId("user-alice")] }];
          dispatch({ type: "messages/updateReactions", messageId: nextMessage.id, reactions: stagedReactions });
        }, 1500);

        window.setTimeout(() => {
          stagedReactions = [...stagedReactions, { emoji: "\u{1F680}", count: 1, userIds: [asUserId("user-bob")] }];
          dispatch({ type: "messages/updateReactions", messageId: nextMessage.id, reactions: stagedReactions });
        }, 3200);

        return true;
      }

      return coreSendMessage({ api, auth, dispatch, getState: () => state }, {
        channelId,
        workspaceSlug,
        content,
        attachmentIds,
        pendingAttachments: attachments.map((a) => ({ id: a.id, filename: a.filename, mimeType: a.mimeType })),
        parentMessageId: parentMessageId ?? undefined,
        userId: user.id,
        senderDisplayName: "You",
      });
    },
    [auth, dispatch, isGallery, state, user],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!user) return;

      if (isGallery) {
        const existing = state.messagesById[messageId];
        if (existing) {
          dispatch({ type: "messages/upsert", message: { ...existing, content, updatedAt: new Date().toISOString() } });
        }
        return;
      }

      await coreEditMessage({ api, auth, dispatch, getState: () => state }, { messageId, content });
    },
    [auth, dispatch, isGallery, state, user],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) return;

      if (isGallery) {
        const existing = state.messagesById[messageId];
        if (existing) {
          dispatch({ type: "messages/delete", messageId, channelId: existing.channelId });
        }
        return;
      }

      await coreDeleteMessage({ api, auth, dispatch, getState: () => state }, { messageId });
    },
    [auth, dispatch, isGallery, state, user],
  );

  const markAsUnread = useCallback(
    async (messageId: string) => {
      if (!user || isGallery || !workspaceSlug) return;
      const message = state.messagesById[messageId];
      if (!message) return;
      await coreMarkChannelAsUnread(
        { api, auth, dispatch, getState: () => state },
        { workspaceSlug, channelId: message.channelId, messageId },
      );
    },
    [auth, dispatch, isGallery, state, user, workspaceSlug],
  );

  return {
    toggleReaction,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsUnread,
  };
}
