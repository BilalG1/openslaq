import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { Message } from "@openslaq/shared";
import { Pin, Bookmark, Copy, Link, Mail, Share2, Pencil, Trash2, MessageSquare } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TRANSPARENT } from "@/theme/constants";

const QUICK_REACTIONS = ["✅", "👀", "🙌"];

interface Props {
  visible: boolean;
  message: Message | null;
  currentUserId?: string;
  isSaved?: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onOpenEmojiPicker: () => void;
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onSaveMessage?: (messageId: string) => void;
  onUnsaveMessage?: (messageId: string) => void;
  onCopyText?: (message: Message) => void;
  onCopyLink?: (message: Message) => void;
  onMarkAsUnread?: (messageId: string) => void;
  onShareMessage?: (message: Message) => void;
  onReplyInThread?: (messageId: string) => void;
  onClose: () => void;
}

export function MessageActionSheet({
  visible,
  message,
  currentUserId,
  isSaved,
  onReaction,
  onOpenEmojiPicker,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onSaveMessage,
  onUnsaveMessage,
  onCopyText,
  onCopyLink,
  onMarkAsUnread,
  onShareMessage,
  onReplyInThread,
  onClose,
}: Props) {
  const { theme } = useMobileTheme();

  if (!message) return null;

  const isOwnMessage = currentUserId != null && message.userId === currentUserId;

  const handleReaction = (emoji: string) => {
    haptics.selection();
    onReaction(message.id, emoji);
    onClose();
  };

  const handleOpenPicker = () => {
    haptics.selection();
    onClose();
    onOpenEmojiPicker();
  };

  const handlePin = () => {
    haptics.selection();
    onClose();
    onPinMessage?.(message.id);
  };

  const handleUnpin = () => {
    haptics.selection();
    onClose();
    onUnpinMessage?.(message.id);
  };

  const handleSave = () => {
    haptics.selection();
    onClose();
    onSaveMessage?.(message.id);
  };

  const handleUnsave = () => {
    haptics.selection();
    onClose();
    onUnsaveMessage?.(message.id);
  };

  const handleCopyText = () => {
    haptics.selection();
    onClose();
    onCopyText?.(message);
  };

  const handleCopyLink = () => {
    haptics.selection();
    onClose();
    onCopyLink?.(message);
  };

  const handleMarkAsUnread = () => {
    haptics.selection();
    onClose();
    onMarkAsUnread?.(message.id);
  };

  const handleShareMessage = () => {
    haptics.selection();
    onClose();
    onShareMessage?.(message);
  };

  const handleReplyInThread = () => {
    haptics.selection();
    onClose();
    onReplyInThread?.(message.id);
  };

  const handleEdit = () => {
    haptics.selection();
    onClose();
    onEditMessage(message);
  };

  const handleDelete = () => {
    haptics.selection();
    onClose();
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteMessage(message.id),
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="action-sheet-content">
      {/* Quick reactions row */}
      <View style={styles.quickReactionsRow}>
        {QUICK_REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            testID={`quick-reaction-${emoji}`}
            accessibilityRole="button"
            accessibilityLabel={`React with ${emoji}`}
            accessibilityHint="Adds this reaction to the message"
            onPress={() => handleReaction(emoji)}
            style={({ pressed }) => [
              styles.reactionButton,
              { backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary },
            ]}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </Pressable>
        ))}
        <Pressable
          testID="quick-reaction-picker"
          accessibilityRole="button"
          accessibilityLabel="More reactions"
          accessibilityHint="Opens the emoji picker"
          onPress={handleOpenPicker}
          style={({ pressed }) => [
            styles.reactionButton,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary },
          ]}
        >
          <Text style={[styles.pickerPlus, { color: theme.colors.textMuted }]}>+</Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.borderDefault }]} />

      {/* Reply in Thread */}
      {onReplyInThread && (
        <Pressable
          testID="action-reply-in-thread"
          accessibilityRole="button"
          accessibilityLabel="Reply in thread"
          accessibilityHint="Opens the message thread to reply"
          onPress={handleReplyInThread}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <MessageSquare size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Reply in Thread</Text>
          </View>
        </Pressable>
      )}

      {/* Pin/Unpin — available to all users */}
      {message.isPinned ? (
        <Pressable
          testID="action-unpin-message"
          accessibilityRole="button"
          accessibilityLabel="Unpin message"
          accessibilityHint="Removes pin from this message"
          onPress={handleUnpin}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <Pin size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Unpin Message</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          testID="action-pin-message"
          accessibilityRole="button"
          accessibilityLabel="Pin message"
          accessibilityHint="Pins this message to the channel"
          onPress={handlePin}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <Pin size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Pin Message</Text>
          </View>
        </Pressable>
      )}

      {/* Save / Unsave */}
      {isSaved ? (
        <Pressable
          testID="action-unsave-message"
          accessibilityRole="button"
          accessibilityLabel="Remove from saved"
          accessibilityHint="Removes this message from your saved items"
          onPress={handleUnsave}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <Bookmark size={20} color={theme.colors.textPrimary} fill={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Remove from Saved</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          testID="action-save-message"
          accessibilityRole="button"
          accessibilityLabel="Save for later"
          accessibilityHint="Saves this message for later"
          onPress={handleSave}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <Bookmark size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Save for Later</Text>
          </View>
        </Pressable>
      )}

      {/* Copy Text */}
      <Pressable
        testID="action-copy-text"
        accessibilityRole="button"
        accessibilityLabel="Copy text"
        accessibilityHint="Copies the message text to clipboard"
        onPress={handleCopyText}
        style={({ pressed }) => [
          styles.actionRow,
          { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
        ]}
      >
        <View style={styles.actionRowContent}>
          <Copy size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
          <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Copy Text</Text>
        </View>
      </Pressable>

      {/* Copy Link */}
      <Pressable
        testID="action-copy-link"
        accessibilityRole="button"
        accessibilityLabel="Copy link"
        accessibilityHint="Copies a link to this message"
        onPress={handleCopyLink}
        style={({ pressed }) => [
          styles.actionRow,
          { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
        ]}
      >
        <View style={styles.actionRowContent}>
          <Link size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
          <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Copy Link</Text>
        </View>
      </Pressable>

      {/* Mark as Unread */}
      {onMarkAsUnread && (
        <Pressable
          testID="action-mark-as-unread"
          accessibilityRole="button"
          accessibilityLabel="Mark as unread"
          accessibilityHint="Marks this message as unread"
          onPress={handleMarkAsUnread}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <Mail size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Mark as Unread</Text>
          </View>
        </Pressable>
      )}

      {/* Share Message */}
      {onShareMessage && (
        <Pressable
          testID="action-share-message"
          accessibilityRole="button"
          accessibilityLabel="Share message"
          accessibilityHint="Shares this message to another channel"
          onPress={handleShareMessage}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
          ]}
        >
          <View style={styles.actionRowContent}>
            <Share2 size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Share Message</Text>
          </View>
        </Pressable>
      )}

      {/* Owner-only actions */}
      {isOwnMessage && (
        <>
          <View style={[styles.dividerVertical, { backgroundColor: theme.colors.borderDefault }]} />
          <Pressable
            testID="action-edit-message"
            accessibilityRole="button"
            accessibilityLabel="Edit message"
            accessibilityHint="Opens editor for this message"
            onPress={handleEdit}
            style={({ pressed }) => [
              styles.actionRow,
              { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
            ]}
          >
            <View style={styles.actionRowContent}>
              <Pencil size={20} color={theme.colors.textPrimary} strokeWidth={1.5} />
              <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Edit Message</Text>
            </View>
          </Pressable>
          <Pressable
            testID="action-delete-message"
            accessibilityRole="button"
            accessibilityLabel="Delete message"
            accessibilityHint="Permanently deletes this message"
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.actionRow,
              { backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT },
            ]}
          >
            <View style={styles.actionRowContent}>
              <Trash2 size={20} color={theme.brand.danger} strokeWidth={1.5} />
              <Text style={[styles.actionLabel, { color: theme.brand.danger }]}>Delete Message</Text>
            </View>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  quickReactionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionEmoji: {
    fontSize: 24,
  },
  pickerPlus: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  dividerVertical: {
    height: 1,
    marginVertical: 8,
  },
  actionRow: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionLabel: {
    fontSize: 16,
  },
});
