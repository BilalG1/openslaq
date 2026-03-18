import { useCallback } from "react";
import { editMessage, deleteMessage, toggleReaction } from "@openslaq/client-core";
import { useOperationDeps } from "./useOperationDeps";

export function useMessageActions(userId?: string) {
  const deps = useOperationDeps();

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      await editMessage(deps, { messageId, content });
    },
    [deps],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(deps, { messageId });
    },
    [deps],
  );

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;
      await toggleReaction(deps, { messageId, emoji, userId });
    },
    [deps, userId],
  );

  return { handleEditMessage, handleDeleteMessage, handleToggleReaction };
}
