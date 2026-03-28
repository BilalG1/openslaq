import React, { createContext, useContext, useReducer } from "react";
import type { Message, EphemeralMessage, MessageId, UserId } from "@openslaq/shared";

export interface EditingMessage {
  id: MessageId;
  content: string;
}

export interface ChannelModalsState {
  editingMessage: EditingMessage | null;
  actionSheetMessage: Message | null;
  showEmojiPicker: boolean;
  emojiPickerMessageId: MessageId | null;
  showTopicEdit: boolean;
  showPinnedSheet: boolean;
  pinnedMessages: Message[];
  pinnedLoading: boolean;
  shareMessage: Message | null;
  ephemeralMessages: EphemeralMessage[];
  showNotificationSheet: boolean;
  showChannelInfo: boolean;
  reactionDetails: { emoji: string; userIds: UserId[]; messageId: MessageId } | null;
}

export type ChannelModalsAction =
  | { type: "setEditingMessage"; message: EditingMessage | null }
  | { type: "showActionSheet"; message: Message }
  | { type: "closeActionSheet" }
  | { type: "showEmojiPicker"; messageId: MessageId | null }
  | { type: "closeEmojiPicker" }
  | { type: "showTopicEdit" }
  | { type: "closeTopicEdit" }
  | { type: "showPinnedSheet" }
  | { type: "closePinnedSheet" }
  | { type: "setPinnedMessages"; messages: Message[] }
  | { type: "removePinnedMessage"; messageId: MessageId }
  | { type: "setPinnedLoading"; loading: boolean }
  | { type: "showShareMessage"; message: Message }
  | { type: "closeShareMessage" }
  | { type: "addEphemeralMessages"; messages: EphemeralMessage[] }
  | { type: "clearEphemeralMessages" }
  | { type: "showNotificationSheet" }
  | { type: "closeNotificationSheet" }
  | { type: "showChannelInfo" }
  | { type: "closeChannelInfo" }
  | { type: "showReactionDetails"; emoji: string; userIds: UserId[]; messageId: MessageId }
  | { type: "closeReactionDetails" }
  | { type: "closeAll" };

export const initialChannelModalsState: ChannelModalsState = {
  editingMessage: null,
  actionSheetMessage: null,
  showEmojiPicker: false,
  emojiPickerMessageId: null,
  showTopicEdit: false,
  showPinnedSheet: false,
  pinnedMessages: [],
  pinnedLoading: false,
  shareMessage: null,
  ephemeralMessages: [],
  showNotificationSheet: false,
  showChannelInfo: false,
  reactionDetails: null,
};

export function channelModalsReducer(
  state: ChannelModalsState,
  action: ChannelModalsAction,
): ChannelModalsState {
  switch (action.type) {
    case "setEditingMessage":
      return { ...state, editingMessage: action.message };
    case "showActionSheet":
      return { ...state, actionSheetMessage: action.message };
    case "closeActionSheet":
      return { ...state, actionSheetMessage: null };
    case "showEmojiPicker":
      return { ...state, showEmojiPicker: true, emojiPickerMessageId: action.messageId };
    case "closeEmojiPicker":
      return { ...state, showEmojiPicker: false, emojiPickerMessageId: null };
    case "showTopicEdit":
      return { ...state, showTopicEdit: true };
    case "closeTopicEdit":
      return { ...state, showTopicEdit: false };
    case "showPinnedSheet":
      return { ...state, showPinnedSheet: true };
    case "closePinnedSheet":
      return { ...state, showPinnedSheet: false };
    case "setPinnedMessages":
      return { ...state, pinnedMessages: action.messages };
    case "removePinnedMessage":
      return { ...state, pinnedMessages: state.pinnedMessages.filter((m) => m.id !== action.messageId) };
    case "setPinnedLoading":
      return { ...state, pinnedLoading: action.loading };
    case "showShareMessage":
      return { ...state, shareMessage: action.message };
    case "closeShareMessage":
      return { ...state, shareMessage: null };
    case "addEphemeralMessages":
      return { ...state, ephemeralMessages: [...state.ephemeralMessages, ...action.messages] };
    case "clearEphemeralMessages":
      return { ...state, ephemeralMessages: [] };
    case "showNotificationSheet":
      return { ...state, showNotificationSheet: true };
    case "closeNotificationSheet":
      return { ...state, showNotificationSheet: false };
    case "showChannelInfo":
      return { ...state, showChannelInfo: true };
    case "closeChannelInfo":
      return { ...state, showChannelInfo: false };
    case "showReactionDetails":
      return { ...state, reactionDetails: { emoji: action.emoji, userIds: action.userIds, messageId: action.messageId } };
    case "closeReactionDetails":
      return { ...state, reactionDetails: null };
    case "closeAll":
      return initialChannelModalsState;
  }
}

const ChannelModalsStateContext = createContext<ChannelModalsState | null>(null);
const ChannelModalsDispatchContext = createContext<React.Dispatch<ChannelModalsAction> | null>(null);

export function ChannelModalsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(channelModalsReducer, initialChannelModalsState);
  return (
    <ChannelModalsStateContext.Provider value={state}>
      <ChannelModalsDispatchContext.Provider value={dispatch}>
        {children}
      </ChannelModalsDispatchContext.Provider>
    </ChannelModalsStateContext.Provider>
  );
}

export function useChannelModalsState(): ChannelModalsState {
  const state = useContext(ChannelModalsStateContext);
  if (!state) throw new Error("useChannelModalsState must be used within ChannelModalsProvider");
  return state;
}

export function useChannelModalsDispatch(): React.Dispatch<ChannelModalsAction> {
  const dispatch = useContext(ChannelModalsDispatchContext);
  if (!dispatch) throw new Error("useChannelModalsDispatch must be used within ChannelModalsProvider");
  return dispatch;
}

export function useChannelModals(): { state: ChannelModalsState; dispatch: React.Dispatch<ChannelModalsAction> } {
  return { state: useChannelModalsState(), dispatch: useChannelModalsDispatch() };
}
