import { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, Image } from "react-native";
import type { GestureResponderEvent } from "react-native";
import type { Message, CustomEmoji } from "@openslaq/shared";
import { parseCustomEmojiName, findCustomEmoji } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { SharedMessageCard } from "./SharedMessageCard";
import { formatTime } from "@/lib/time";

interface Props {
  message: Message;
  isGrouped?: boolean;
  onPressThread?: (messageId: string) => void;
  currentUserId?: string;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  onPressSender?: (userId: string) => void;
  onPressMention?: (userId: string) => void;
  customEmojis?: CustomEmoji[];
}

function isEdited(message: Message): boolean {
  return new Date(message.updatedAt) > new Date(message.createdAt);
}

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
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
          style={{ width: 16, height: 16 }}
          accessibilityLabel={customName}
        />
      );
    }
    return <Text style={{ fontSize: 14, marginRight: 4 }}>:{customName}:</Text>;
  }
  return <Text style={{ fontSize: 14, marginRight: 4 }}>{emoji}</Text>;
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
}: Props) {
  const { theme } = useMobileTheme();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleTouchStart = useCallback(
    (_e: GestureResponderEvent) => {
      if (!onLongPress) return;
      clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        haptics.heavy();
        onLongPress(message);
      }, 400);
    },
    [message, onLongPress],
  );

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <View
      testID={`message-bubble-${message.id}`}
      style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: isGrouped ? 2 : 8,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Avatar or spacer for grouped messages */}
      {isGrouped ? (
        <View style={{ width: 36, marginRight: 10 }} />
      ) : (
        <Pressable
          onPress={() => onPressSender?.(message.userId)}
          disabled={!onPressSender}
          style={{ marginRight: 10, marginTop: 2 }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: theme.colors.avatarFallbackBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.avatarFallbackText }}>
              {getInitials(message.senderDisplayName)}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {!isGrouped && (
        <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 2 }}>
          <Pressable
            testID={`sender-name-${message.id}`}
            onPress={() => onPressSender?.(message.userId)}
            disabled={!onPressSender}
          >
            <Text style={{ fontWeight: "700", fontSize: 15, color: theme.colors.textPrimary }}>
              {message.senderDisplayName ?? "Unknown"}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginLeft: 8 }}>
            {formatTime(message.createdAt)}
          </Text>
          {isEdited(message) && (
            <Text
              testID={`message-edited-${message.id}`}
              style={{ fontSize: 12, marginLeft: 4, color: theme.colors.textFaint }}
            >
              (edited)
            </Text>
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
          <View style={{ marginTop: 4, gap: 6 }}>
            {message.linkPreviews.map((p) => (
              <LinkPreviewCard key={p.url} preview={p} />
            ))}
          </View>
        )}
        {message.reactions && message.reactions.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 4 }}>
            {message.reactions.map((r) => {
              const isActive = currentUserId != null && r.userIds.some((userId) => userId === currentUserId);
              return (
                <Pressable
                  key={r.emoji}
                  testID={`reaction-${message.id}-${r.emoji}`}
                  onPress={() => onToggleReaction?.(message.id, r.emoji)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 9999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: isActive ? theme.colors.surfaceSelected : theme.colors.surfaceTertiary,
                    borderWidth: 1,
                    borderColor: isActive ? theme.brand.primary : "transparent",
                  }}
                >
                  <ReactionEmoji emoji={r.emoji} customEmojis={customEmojis} />
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{r.count}</Text>
                </Pressable>
              );
            })}
            {onToggleReaction && (
              <Pressable
                testID={`reaction-add-${message.id}`}
                onPress={() => onLongPress?.(message)}
                style={{ flexDirection: "row", alignItems: "center", borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.colors.surfaceTertiary }}
              >
                <Text style={{ fontSize: 14, color: theme.colors.textMuted }}>+</Text>
              </Pressable>
            )}
          </View>
        )}
        {message.replyCount > 0 && (
          <Pressable
            testID={`reply-count-${message.id}`}
            onPress={() => onPressThread?.(message.id)}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 4,
              borderRadius: 9999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
            })}
            hitSlop={4}
          >
            <Text style={{ fontSize: 12, fontWeight: "500", color: theme.brand.primary }}>
              {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
