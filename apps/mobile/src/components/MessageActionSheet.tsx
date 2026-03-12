import { Alert, Modal, Pressable, Text, View } from "react-native";
import type { Message } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID="action-sheet-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          testID="action-sheet-content"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 34,
            paddingTop: 12,
            paddingHorizontal: 16,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Quick reactions row */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                testID={`quick-reaction-${emoji}`}
                onPress={() => handleReaction(emoji)}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </Pressable>
            ))}
            <Pressable
              testID="quick-reaction-picker"
              onPress={handleOpenPicker}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Text style={{ fontSize: 20, color: theme.colors.textMuted }}>+</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginBottom: 8 }} />

          {/* Pin/Unpin — available to all users */}
          {message.isPinned ? (
            <Pressable
              testID="action-unpin-message"
              onPress={handleUnpin}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Unpin Message</Text>
            </Pressable>
          ) : (
            <Pressable
              testID="action-pin-message"
              onPress={handlePin}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Pin Message</Text>
            </Pressable>
          )}

          {/* Save / Unsave */}
          {isSaved ? (
            <Pressable
              testID="action-unsave-message"
              onPress={handleUnsave}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Remove from Saved</Text>
            </Pressable>
          ) : (
            <Pressable
              testID="action-save-message"
              onPress={handleSave}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Save for Later</Text>
            </Pressable>
          )}

          {/* Copy Text */}
          <Pressable
            testID="action-copy-text"
            onPress={handleCopyText}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
            })}
          >
            <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Copy Text</Text>
          </Pressable>

          {/* Copy Link */}
          <Pressable
            testID="action-copy-link"
            onPress={handleCopyLink}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
            })}
          >
            <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Copy Link</Text>
          </Pressable>

          {/* Mark as Unread */}
          {onMarkAsUnread && (
            <Pressable
              testID="action-mark-as-unread"
              onPress={handleMarkAsUnread}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Mark as Unread</Text>
            </Pressable>
          )}

          {/* Share Message */}
          {onShareMessage && (
            <Pressable
              testID="action-share-message"
              onPress={handleShareMessage}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Share Message</Text>
            </Pressable>
          )}

          {/* Owner-only actions */}
          {isOwnMessage && (
            <>
              <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginVertical: 8 }} />
              <Pressable
                testID="action-edit-message"
                onPress={handleEdit}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
                })}
              >
                <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Edit Message</Text>
              </Pressable>
              <Pressable
                testID="action-delete-message"
                onPress={handleDelete}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
                })}
              >
                <Text style={{ fontSize: 16, color: theme.brand.danger }}>Delete Message</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
