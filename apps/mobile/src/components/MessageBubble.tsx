import { useCallback, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import type { GestureResponderEvent } from "react-native";
import type { Message } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
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
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isEdited(message: Message): boolean {
  return new Date(message.updatedAt) > new Date(message.createdAt);
}

export function MessageBubble({
  message,
  onPressThread,
  currentUserId,
  onToggleReaction,
  onLongPress,
  onPressSender,
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
      className="px-4 py-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <View className="flex-row items-baseline mb-0.5">
        <Pressable
          testID={`sender-name-${message.id}`}
          onPress={() => onPressSender?.(message.userId)}
          disabled={!onPressSender}
        >
          <Text className="font-semibold text-sm mr-2" style={{ color: theme.colors.textPrimary }}>
            {message.senderDisplayName ?? "Unknown"}
          </Text>
        </Pressable>
        <Text className="text-xs" style={{ color: theme.colors.textFaint }}>
          {formatTime(message.createdAt)}
        </Text>
        {isEdited(message) && (
          <Text
            testID={`message-edited-${message.id}`}
            className="text-xs ml-1"
            style={{ color: theme.colors.textFaint }}
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
        />
      </View>
      {message.attachments.length > 0 && (
        <MessageAttachments attachments={message.attachments} />
      )}
      {message.linkPreviews && message.linkPreviews.length > 0 && (
        <View className="mt-1 gap-1.5">
          {message.linkPreviews.map((p) => (
            <LinkPreviewCard key={p.url} preview={p} />
          ))}
        </View>
      )}
      {message.reactions && message.reactions.length > 0 && (
        <View className="flex-row flex-wrap mt-1 gap-1">
          {message.reactions.map((r) => {
            const isActive = currentUserId != null && r.userIds.some((userId) => userId === currentUserId);
            return (
              <Pressable
                key={r.emoji}
                testID={`reaction-${message.id}-${r.emoji}`}
                onPress={() => onToggleReaction?.(message.id, r.emoji)}
                className="flex-row items-center rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: isActive ? theme.colors.surfaceSelected : theme.colors.surfaceTertiary,
                  borderWidth: 1,
                  borderColor: isActive ? theme.brand.primary : "transparent",
                }}
              >
                <Text className="text-sm mr-1">{r.emoji}</Text>
                <Text className="text-xs" style={{ color: theme.colors.textMuted }}>{r.count}</Text>
              </Pressable>
            );
          })}
          {onToggleReaction && (
            <Pressable
              testID={`reaction-add-${message.id}`}
              onPress={() => onLongPress?.(message)}
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: theme.colors.surfaceTertiary }}
            >
              <Text className="text-sm" style={{ color: theme.colors.textMuted }}>+</Text>
            </Pressable>
          )}
        </View>
      )}
      {message.replyCount > 0 && (
        <Pressable
          testID={`reply-count-${message.id}`}
          onPress={() => onPressThread?.(message.id)}
          className="self-start mt-1 rounded-full px-2.5 py-1"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
          })}
          hitSlop={4}
        >
          <Text className="text-xs font-medium" style={{ color: theme.brand.primary }}>
            {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
