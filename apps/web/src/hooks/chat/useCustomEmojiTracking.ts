import { useCallback } from "react";
import type { CustomEmoji } from "@openslaq/shared";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";

export function useCustomEmojiTracking() {
  const { dispatch } = useChatStore();

  const onAdded = useCallback(
    (payload: { emoji: CustomEmoji }) => {
      dispatch({ type: "emoji/add", emoji: payload.emoji });
    },
    [dispatch],
  );

  const onDeleted = useCallback(
    (payload: { emojiId: string }) => {
      dispatch({ type: "emoji/remove", emojiId: payload.emojiId });
    },
    [dispatch],
  );

  useSocketEvent("emoji:added", onAdded);
  useSocketEvent("emoji:deleted", onDeleted);
}
