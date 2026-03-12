import { useCallback, useRef } from "react";
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

interface Props {
  message: Message;
  onPressThread?: (messageId: string) => void;
  currentUserId?: string;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  onPressSender?: (userId: string) => void;
  customEmojis?: CustomEmoji[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isEdited(message: Message): boolean {
  return new Date(message.updatedAt) > new Date(message.createdAt);
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
  onPressThread,
  currentUserId,
  onToggleReaction,
  onLongPress,
  onPressSender,
  customEmojis,
}: Props) {
  const { theme } = useMobileTheme();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Manual long-press via raw onTouchStart/onTouchEnd. Pressable.onLongPress
  // is unreliable inside FlatList under the Fabric renderer — the scroll
  // view's gesture recognizer cancels the press before the 500ms threshold,
  // so Detox (and sometimes real users with slight movement) never triggers
  // the callback. Raw touch events bypass the responder system.
  const handleTouchStart = useCallback(
    (_e: GestureResponderEvent) => {
      if (!onLongPress) return;
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

  return (
    <View
      testID={`message-bubble-${message.id}`}
      style={{ paddingHorizontal: 16, paddingVertical: 8 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }}>
        <Pressable
          testID={`sender-name-${message.id}`}
          onPress={() => onPressSender?.(message.userId)}
          disabled={!onPressSender}
        >
          <Text style={{ fontWeight: '600', fontSize: 14, marginRight: 8, color: theme.colors.textPrimary }}>
            {message.senderDisplayName ?? "Unknown"}
          </Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: theme.colors.textFaint }}>
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
      {message.sharedMessage && (
        <SharedMessageCard sharedMessage={message.sharedMessage} />
      )}
      <View testID={`message-content-${message.id}`}>
        <MessageContent
          content={message.content}
          mentions={message.mentions}
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 }}>
          {message.reactions.map((r) => {
            const isActive = currentUserId != null && r.userIds.some((userId) => userId === currentUserId);
            return (
              <Pressable
                key={r.emoji}
                testID={`reaction-${message.id}-${r.emoji}`}
                onPress={() => onToggleReaction?.(message.id, r.emoji)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
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
              style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.colors.surfaceTertiary }}
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
            alignSelf: 'flex-start',
            marginTop: 4,
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
          })}
          hitSlop={4}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.brand.primary }}>
            {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
