import { useCallback, useState } from "react";
import type { Message } from "@openslaq/shared";
import { shareMessageOp, saveMessageOp, unsaveMessageOp } from "@openslaq/client-core";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { useOperationDeps } from "./useOperationDeps";

export function useMessageActions(workspaceSlug: string | undefined) {
  const deps = useOperationDeps();
  const { state } = useChatStore();
  const { currentChannelId } = useChatSelectors();
  const [shareDialogMessage, setShareDialogMessage] = useState<Message | null>(null);

  const saveMessage = useCallback(
    (messageId: string) => {
      if (!workspaceSlug || !currentChannelId) return;
      void saveMessageOp(deps, { workspaceSlug, channelId: currentChannelId, messageId });
    },
    [deps, workspaceSlug, currentChannelId],
  );

  const unsaveMessage = useCallback(
    (messageId: string, channelId?: string) => {
      if (!workspaceSlug) return;
      const ch = channelId ?? currentChannelId;
      if (!ch) return;
      void unsaveMessageOp(deps, { workspaceSlug, channelId: ch, messageId });
    },
    [deps, workspaceSlug, currentChannelId],
  );

  const shareMessage = useCallback(
    (messageId: string) => {
      const msg = state.messagesById[messageId];
      if (msg) setShareDialogMessage(msg);
    },
    [state.messagesById],
  );

  const confirmShare = useCallback(
    (destinationChannelId: string, comment: string) => {
      if (!workspaceSlug || !shareDialogMessage) return;
      void shareMessageOp(deps, {
        workspaceSlug,
        destinationChannelId,
        sharedMessageId: shareDialogMessage.id,
        comment,
      });
      setShareDialogMessage(null);
    },
    [deps, workspaceSlug, shareDialogMessage],
  );

  const closeShareDialog = useCallback(() => {
    setShareDialogMessage(null);
  }, []);

  return { saveMessage, unsaveMessage, shareMessage, confirmShare, shareDialogMessage, closeShareDialog };
}
