import { createContext, useContext } from "react";
import type { CustomEmoji } from "@openslaq/shared";

export interface MessageActionsContextValue {
  onOpenThread?: (messageId: string) => void;
  onOpenProfile?: (userId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onMarkAsUnread?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onShareMessage?: (messageId: string) => void;
  onSaveMessage?: (messageId: string) => void;
  onUnsaveMessage?: (messageId: string) => void;
  onBotAction?: (messageId: string, actionId: string) => void;
  savedMessageIds?: string[];
  customEmojis?: CustomEmoji[];
  currentUserId?: string;
}

const MessageActionsContext = createContext<MessageActionsContextValue>({});

export const MessageActionsProvider = MessageActionsContext.Provider;

export function useMessageActionsContext() {
  return useContext(MessageActionsContext);
}
