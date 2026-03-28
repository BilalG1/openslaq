import { useCallback } from "react";
import { editMessage, deleteMessage, toggleReaction } from "@openslaq/client-core";
import type { MessageId, UserId } from "@openslaq/shared";
import { useOperationDeps } from "./useOperationDeps";

export function useMessageActions(userId?: UserId) {
  const deps = useOperationDeps();

  const handleEditMessage = useCallback(
    async (messageId: MessageId, content: string) => {
      await editMessage(deps, { messageId, content });
    },
    [deps],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: MessageId) => {
      await deleteMessage(deps, { messageId });
    },
    [deps],
  );

  const handleToggleReaction = useCallback(
    async (messageId: MessageId, emoji: string) => {
      if (!userId) return;
      await toggleReaction(deps, { messageId, emoji, userId });
    },
    [deps, userId],
  );

  return { handleEditMessage, handleDeleteMessage, handleToggleReaction };
}
