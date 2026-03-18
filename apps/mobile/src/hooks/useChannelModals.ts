import { useState } from "react";
import type { Message, EphemeralMessage } from "@openslaq/shared";

export interface EditingMessage {
  id: string;
  content: string;
}

export interface ChannelModals {
  editingMessage: EditingMessage | null;
  setEditingMessage: (msg: EditingMessage | null) => void;
  actionSheetMessage: Message | null;
  setActionSheetMessage: (msg: Message | null) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerMessageId: string | null;
  setEmojiPickerMessageId: (id: string | null) => void;
  showTopicEdit: boolean;
  setShowTopicEdit: (show: boolean) => void;
  showPinnedSheet: boolean;
  setShowPinnedSheet: (show: boolean) => void;
  pinnedMessages: Message[];
  setPinnedMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pinnedLoading: boolean;
  setPinnedLoading: (loading: boolean) => void;
  shareMessage: Message | null;
  setShareMessage: (msg: Message | null) => void;
  ephemeralMessages: EphemeralMessage[];
  setEphemeralMessages: React.Dispatch<React.SetStateAction<EphemeralMessage[]>>;
  showNotificationSheet: boolean;
  setShowNotificationSheet: (show: boolean) => void;
  showChannelInfo: boolean;
  setShowChannelInfo: (show: boolean) => void;
}

export function useChannelModals(): ChannelModals {
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [showTopicEdit, setShowTopicEdit] = useState(false);
  const [showPinnedSheet, setShowPinnedSheet] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState<Message | null>(null);
  const [ephemeralMessages, setEphemeralMessages] = useState<EphemeralMessage[]>([]);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);

  return {
    editingMessage,
    setEditingMessage,
    actionSheetMessage,
    setActionSheetMessage,
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerMessageId,
    setEmojiPickerMessageId,
    showTopicEdit,
    setShowTopicEdit,
    showPinnedSheet,
    setShowPinnedSheet,
    pinnedMessages,
    setPinnedMessages,
    pinnedLoading,
    setPinnedLoading,
    shareMessage,
    setShareMessage,
    ephemeralMessages,
    setEphemeralMessages,
    showNotificationSheet,
    setShowNotificationSheet,
    showChannelInfo,
    setShowChannelInfo,
  };
}
