import { useCallback, useMemo } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import type { Message, MessageId, UserId, CustomEmoji, MessageActionButton } from "@openslaq/shared";
import type { MobileTheme } from "@openslaq/shared";
import { parseCustomEmojiName, findCustomEmoji } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { isMessageEdited, getInitials } from "@/utils/message-list-utils";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { SharedMessageCard } from "./SharedMessageCard";
import { formatTime } from "@/lib/time";

import { SmilePlus } from "lucide-react-native";
import { TRANSPARENT, WHITE, YELLOW_DARK, YELLOW_LIGHT, PINNED_BG_LIGHT, PINNED_BG_DARK } from "@/theme/constants";

interface Props {
  message: Message;
  isGrouped?: boolean;
  onPressThread?: (messageId: MessageId) => void;
  currentUserId?: UserId;
  onToggleReaction?: (messageId: MessageId, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  onPressSender?: (userId: UserId) => void;
  onPressMention?: (userId: UserId) => void;
  customEmojis?: CustomEmoji[];
  highlighted?: boolean;
  onAddReaction?: (message: Message) => void;
  onLongPressReaction?: (message: Message, emoji: string) => void;
  onBotAction?: (messageId: MessageId, actionId: string) => void;
  senderStatusEmoji?: string | null;
}

function ReactionEmoji({ emoji, customEmojis }: { emoji: string; customEmojis?: CustomEmoji[] }) {
  const customName = parseCustomEmojiName(emoji);
  if (customName && customEmojis) {
    const found = findCustomEmoji(customName, customEmojis);
    if (found) {
      return (
        <Image
          testID={`custom-reaction-${customName}`}
          source={{ uri: found.url }}
          style={staticStyles.customEmojiImage}
          accessibilityLabel={customName}
          accessibilityHint={`Custom emoji: ${customName}`}
        />
      );
    }
    return <Text style={staticStyles.emojiText}>:{customName}:</Text>;
  }
  return <Text style={staticStyles.emojiText}>{emoji}</Text>;
}

export function MessageBubble({
  message,
  isGrouped,
  onPressThread,
  currentUserId,
  onToggleReaction,
  onLongPress,
  onPressSender,
  onPressMention,
  customEmojis,
  highlighted = false,
  onAddReaction,
  onLongPressReaction,
  onBotAction,
  senderStatusEmoji,
}: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const handleLongPress = useCallback(() => {
    if (!onLongPress) return;
    haptics.heavy();
    onLongPress(message);
  }, [message, onLongPress]);

  return (
    <Pressable
      testID={`message-bubble-${message.id}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        staticStyles.container,
        isGrouped ? staticStyles.containerGrouped : staticStyles.containerUngrouped,
        highlighted ? styles.highlightedContainer : null,
        message.isPinned ? styles.pinnedContainer : null,
        pressed && onLongPress ? styles.pressedContainer : null,
      ]}
      onLongPress={handleLongPress}
      delayLongPress={400}
      disabled={!onLongPress}
    >
      {/* Avatar or spacer for grouped messages */}
      {isGrouped ? (
        <View style={staticStyles.avatarSpacer} />
      ) : (
        <Pressable
          onPress={() => onPressSender?.(message.userId)}
          disabled={!onPressSender}
          style={staticStyles.avatarPressable}
          accessibilityRole="button"
          accessibilityLabel={`View profile of ${message.senderDisplayName ?? "Unknown"}`}
          accessibilityHint="Opens the sender's profile"
        >
          {message.senderAvatarUrl ? (
            <Image
              testID={`message-avatar-image-${message.id}`}
              source={{ uri: message.senderAvatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {getInitials(message.senderDisplayName)}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Content */}
      <View style={staticStyles.contentContainer}>
        {!isGrouped && (
        <View style={staticStyles.senderRow}>
          <Pressable
            testID={`sender-name-${message.id}`}
            onPress={() => onPressSender?.(message.userId)}
            disabled={!onPressSender}
            accessibilityRole="button"
            accessibilityLabel={`View profile of ${message.senderDisplayName ?? "Unknown"}`}
            accessibilityHint="Opens the sender's profile"
          >
            <Text style={styles.senderName}>
              {message.senderDisplayName ?? "Unknown"}
            </Text>
          </Pressable>
          {message.isBot && (
            <View testID={`bot-badge-${message.id}`} style={styles.appBadge}>
              <Text style={styles.appBadgeText}>APP</Text>
            </View>
          )}
          {senderStatusEmoji ? (
            <Text testID={`status-emoji-${message.id}`} style={staticStyles.statusEmoji}>{senderStatusEmoji}</Text>
          ) : null}
          <Text style={styles.timestamp}>
            {formatTime(message.createdAt)}
          </Text>
          {isMessageEdited(message) && (
            <Text
              testID={`message-edited-${message.id}`}
              style={styles.editedLabel}
            >
              (edited)
            </Text>
          )}
          {message.isPinned && (
            <View testID={`pinned-badge-${message.id}`} style={staticStyles.pinnedBadge}>
              <Text style={styles.pinnedBadgeText}>📌 Pinned</Text>
            </View>
          )}
        </View>
        )}
        {message.sharedMessage && (
          <SharedMessageCard sharedMessage={message.sharedMessage} />
        )}
        <View testID={`message-content-${message.id}`}>
          <MessageContent
            content={message.content}
            mentions={message.mentions}
            onPressMention={onPressMention}
            customEmojis={customEmojis}
          />
        </View>
        {message.attachments.length > 0 && (
          <MessageAttachments attachments={message.attachments} />
        )}
        {message.linkPreviews && message.linkPreviews.length > 0 && (
          <View style={staticStyles.linkPreviewsContainer}>
            {message.linkPreviews.map((p) => (
              <LinkPreviewCard key={p.url} preview={p} />
            ))}
          </View>
        )}
        {message.isBot && message.actions && message.actions.length > 0 && (
          <View testID={`bot-actions-${message.id}`} style={staticStyles.botActionsRow}>
            {message.actions.map((action: MessageActionButton) => {
              const btnStyle =
                action.style === "primary"
                  ? styles.botActionPrimary
                  : action.style === "danger"
                    ? styles.botActionDanger
                    : styles.botActionDefault;
              const textStyle =
                action.style === "primary" || action.style === "danger"
                  ? styles.botActionTextLight
                  : styles.botActionTextDefault;
              return (
                <Pressable
                  key={action.id}
                  testID={`bot-action-${message.id}-${action.id}`}
                  style={btnStyle}
                  onPress={() => onBotAction?.(message.id, action.id)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityHint="Triggers the bot action"
                >
                  <Text style={textStyle}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {message.reactions && message.reactions.length > 0 && (
          <View style={staticStyles.reactionsContainer}>
            {message.reactions.map((r) => {
              const isActive = currentUserId != null && r.userIds.some((userId) => userId === currentUserId);
              return (
                <Pressable
                  key={r.emoji}
                  testID={`reaction-${message.id}-${r.emoji}`}
                  onPress={() => onToggleReaction?.(message.id, r.emoji)}
                  onLongPress={onLongPressReaction ? () => {
                    haptics.medium();
                    onLongPressReaction(message, r.emoji);
                  } : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.emoji} reaction, ${r.count} ${r.count === 1 ? "person" : "people"}`}
                  accessibilityHint="Toggles your reaction"
                  style={[
                    styles.reactionPill,
                    isActive ? styles.reactionPillActive : styles.reactionPillInactive,
                  ]}
                >
                  <ReactionEmoji emoji={r.emoji} customEmojis={customEmojis} />
                  <Text style={styles.reactionCount}>{r.count}</Text>
                </Pressable>
              );
            })}
            {onToggleReaction && (
              <Pressable
                testID={`reaction-add-${message.id}`}
                onPress={() => (onAddReaction ?? onLongPress)?.(message)}
                style={styles.addReactionButton}
                accessibilityRole="button"
                accessibilityLabel="Add reaction"
                accessibilityHint="Opens the emoji picker to add a reaction"
              >
                <SmilePlus size={18} color={theme.colors.textMuted} testID="smile-plus-icon" />
              </Pressable>
            )}
          </View>
        )}
        {message.replyCount > 0 && (
          <Pressable
            testID={`reply-count-${message.id}`}
            onPress={() => onPressThread?.(message.id)}
            accessibilityRole="button"
            accessibilityLabel={`${message.replyCount} ${message.replyCount === 1 ? "reply" : "replies"}`}
            accessibilityHint="Opens the message thread"
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 4,
              borderRadius: 9999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT,
            })}
            hitSlop={4}
          >
            <Text style={styles.replyCountText}>
              {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const staticStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  containerGrouped: {
    paddingVertical: 2,
  },
  containerUngrouped: {
    paddingVertical: 8,
  },
  avatarSpacer: {
    width: 36,
    marginRight: 10,
  },
  avatarPressable: {
    marginRight: 10,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2,
  },
  linkPreviewsContainer: {
    marginTop: 4,
    gap: 6,
  },
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 4,
  },
  customEmojiImage: {
    width: 18,
    height: 18,
  },
  emojiText: {
    fontSize: 16,
    marginRight: 4,
  },
  statusEmoji: {
    fontSize: 14,
    marginLeft: 4,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  botActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.colors.avatarFallbackBg,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.colors.avatarFallbackBg,
    },
    avatarInitials: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.avatarFallbackText,
    },
    senderName: {
      fontWeight: "700",
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.textFaint,
      marginLeft: 8,
    },
    editedLabel: {
      fontSize: 12,
      marginLeft: 4,
      color: theme.colors.textFaint,
    },
    reactionPill: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 9999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
    },
    reactionPillActive: {
      backgroundColor: theme.colors.surfaceSelected,
      borderColor: theme.brand.primary,
    },
    reactionPillInactive: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderColor: theme.colors.surfaceTertiary,
    },
    reactionCount: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    addReactionButton: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 9999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    replyCountText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.brand.primary,
    },
    highlightedContainer: {
      backgroundColor: theme.brand.primary + "12",
      borderRadius: 12,
    },
    pressedContainer: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: 12,
    },
    appBadge: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
      marginLeft: 6,
    },
    appBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    pinnedContainer: {
      backgroundColor: theme.mode === "dark" ? PINNED_BG_DARK : PINNED_BG_LIGHT,
      borderRadius: 12,
    },
    pinnedBadgeText: {
      fontSize: 11,
      color: theme.mode === "dark" ? YELLOW_DARK : YELLOW_LIGHT,
    },
    botActionPrimary: {
      backgroundColor: theme.brand.primary,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    botActionDanger: {
      backgroundColor: theme.brand.danger,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    botActionDefault: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    botActionTextLight: {
      fontSize: 13,
      fontWeight: "600",
      color: WHITE,
    },
    botActionTextDefault: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
  });
