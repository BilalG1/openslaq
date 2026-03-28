import { useCallback } from "react";
import type { Message, ChannelId, MessageId, ReactionGroup } from "@openslaq/shared";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useSocketEvent } from "@/hooks/useSocketEvent";

export function useChannelSocketEvents(channelId: ChannelId | undefined) {
  const { dispatch } = useChatStore();
  const { joinChannel, leaveChannel } = useSocket();

  const onMessageNew = useCallback(
    (message: Message) => {
      dispatch({ type: "messages/upsert", message });
    },
    [dispatch],
  );

  const onMessageUpdated = useCallback(
    (message: Message) => {
      dispatch({ type: "messages/upsert", message });
    },
    [dispatch],
  );

  const onMessageDeleted = useCallback(
    (payload: { id: MessageId; channelId: ChannelId }) => {
      dispatch({
        type: "messages/delete",
        messageId: payload.id,
        channelId: payload.channelId,
      });
    },
    [dispatch],
  );

  const onReactionUpdated = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; reactions: ReactionGroup[] }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updateReactions",
          messageId: payload.messageId,
          reactions: payload.reactions,
        });
      }
    },
    [channelId, dispatch],
  );

  useSocketEvent("message:new", onMessageNew);
  useSocketEvent("message:updated", onMessageUpdated);
  useSocketEvent("message:deleted", onMessageDeleted);
  useSocketEvent("reaction:updated", onReactionUpdated);

  return { joinChannel, leaveChannel };
}
