import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { asMessageId, type Message, type MessageId, type UserId, type ChannelId, type CustomEmoji, type ChannelEventMessage, type HuddleMessage, type MobileTheme } from "@openslaq/shared";
import { MessageBubble } from "@/components/MessageBubble";
import { ChannelEventSystemMessage } from "@/components/ChannelEventSystemMessage";
import { HuddleSystemMessage } from "@/components/HuddleSystemMessage";
import { EphemeralMessageBubble } from "@/components/EphemeralMessageBubble";
import { useMessageScrollTarget } from "@/hooks/useMessageScrollTarget";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import {
  shouldShowDaySeparator,
  shouldGroupMessages,
  getActiveStatusEmoji,
  formatDayLabel,
} from "@/utils/message-list-utils";
import type { ScrollTarget } from "@openslaq/client-core";
import type { EphemeralMessage } from "@openslaq/shared";

interface Props {
  channelId: ChannelId;
  messages: Message[];
  customEmojis: CustomEmoji[];
  currentUserId?: UserId;
  ephemeralMessages: EphemeralMessage[];
  scrollTarget: ScrollTarget | null;
  isLoading: boolean;
  pagination?: { hasOlder?: boolean; loadingOlder?: boolean; olderCursor?: string | null };
  onPressThread: (messageId: MessageId) => void;
  onPressSender: (userId: UserId) => void;
  onToggleReaction: (messageId: MessageId, emoji: string) => void;
  onLongPress: (message: Message) => void;
  onAddReaction?: (message: Message) => void;
  onLongPressReaction?: (message: Message, emoji: string) => void;
  onLoadOlder: () => void;
  onBotAction?: (messageId: MessageId, actionId: string) => void;
}

export interface ChannelMessageListRef {
  scrollToBottom: () => void;
}

export const ChannelMessageList = forwardRef<ChannelMessageListRef, Props>(function ChannelMessageList({
  channelId,
  messages,
  customEmojis,
  currentUserId,
  ephemeralMessages,
  scrollTarget,
  isLoading,
  pagination,
  onPressThread,
  onPressSender,
  onToggleReaction,
  onLongPress,
  onAddReaction,
  onLongPressReaction,
  onLoadOlder,
  onBotAction,
}: Props, ref) {
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);
  const flatListRef = useRef<FlatList<Message>>(null);

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
  }));
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRetryCountRef = useRef(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<MessageId | null>(null);

  // Reverse messages for inverted FlatList: data[0] renders at the bottom,
  // so newest message must be first for correct chat ordering.
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    return () => {
      if (scrollRetryTimerRef.current) clearTimeout(scrollRetryTimerRef.current);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const highlightMessage = useCallback((messageId: MessageId) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedMessageId(messageId);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
      highlightTimeoutRef.current = null;
    }, 2000);
  }, []);

  const activeScrollTarget =
    scrollTarget != null &&
    scrollTarget.channelId === channelId &&
    scrollTarget.parentMessageId == null
      ? scrollTarget
      : null;

  useMessageScrollTarget({
    scrollTarget: activeScrollTarget,
    messages,
    listRef: flatListRef,
    isInitialLoading: isLoading,
    canLoadOlder: pagination?.hasOlder ?? false,
    loadingOlder: pagination?.loadingOlder ?? false,
    onLoadOlder,
    onResolve: (messageId) => {
      highlightMessage(asMessageId(messageId));
      dispatch({ type: "navigation/clearScrollTarget" });
    },
    onExhausted: () => {
      dispatch({ type: "navigation/clearScrollTarget" });
    },
  });

  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to new messages when user is near bottom of the inverted list
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isNearBottomRef.current) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // With inverted list, "top" is the newest messages and scrolling
      // towards the end (larger contentOffset.y) reaches older messages.
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      // In inverted list, contentOffset.y near 0 = near newest messages (bottom)
      isNearBottomRef.current = contentOffset.y < 100;
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromEnd < 200) {
        onLoadOlder();
      }
    },
    [onLoadOlder],
  );

  return (
    <FlatList
      ref={flatListRef}
      testID="message-list"
      data={reversedMessages}
      keyExtractor={(item) => item.id}
      onScroll={handleScroll}
      scrollEventThrottle={200}
      onScrollToIndexFailed={({ index }) => {
        if (scrollRetryCountRef.current >= 3) {
          scrollRetryCountRef.current = 0;
          return;
        }
        scrollRetryCountRef.current += 1;
        scrollRetryTimerRef.current = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: false,
            viewPosition: 0.5,
          });
        }, 50);
      }}
      maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
      ListHeaderComponent={
        ephemeralMessages.length > 0 ? (
          <View testID="ephemeral-messages">
            {ephemeralMessages.map((msg) => (
              <EphemeralMessageBubble key={msg.id} message={msg} />
            ))}
          </View>
        ) : undefined
      }
      renderItem={({ item, index }) => {
        if (item.type === "channel_event") {
          return <ChannelEventSystemMessage message={item as ChannelEventMessage} />;
        }
        if (item.type === "huddle") {
          return <HuddleSystemMessage message={item as HuddleMessage} />;
        }
        // In the reversed array, the chronologically previous message is at index + 1
        const prev = index < reversedMessages.length - 1 ? reversedMessages[index + 1] : undefined;
        const showDaySeparator = shouldShowDaySeparator(prev, item);
        const isGrouped = shouldGroupMessages(prev, item, showDaySeparator);
        const statusEmoji = getActiveStatusEmoji(state.presence[item.userId]);

        return (
          <View>
            {showDaySeparator && (
              <DaySeparator date={new Date(item.createdAt)} theme={theme} />
            )}
            <MessageBubble
              message={item}
              isGrouped={isGrouped}
              onPressThread={onPressThread}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
              onLongPress={onLongPress}
              onAddReaction={onAddReaction}
              onLongPressReaction={onLongPressReaction}
              onPressSender={onPressSender}
              onPressMention={onPressSender}
              customEmojis={customEmojis}
              highlighted={item.id === highlightedMessageId}
              onBotAction={onBotAction}
              senderStatusEmoji={statusEmoji}
            />
          </View>
        );
      }}
      inverted
      ListFooterComponent={
        pagination?.loadingOlder ? (
          <View style={styles.paginationSpinner}>
            <ActivityIndicator size="small" color={theme.brand.primary} />
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
        </View>
      }
      contentContainerStyle={
        messages.length === 0 ? staticStyles.flexOne : staticStyles.invertedBottomPadding
      }
    />
  );
});

function DaySeparator({ date, theme }: { date: Date; theme: MobileTheme }) {
  return (
    <View testID="day-separator" style={daySepStyles.container}>
      <View style={[daySepStyles.line, { backgroundColor: theme.colors.borderDefault }]} />
      <Text style={[daySepStyles.label, { color: theme.colors.textMuted }]}>{formatDayLabel(date)}</Text>
      <View style={[daySepStyles.line, { backgroundColor: theme.colors.borderDefault }]} />
    </View>
  );
}

const daySepStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 12,
  },
});

const staticStyles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  invertedBottomPadding: {
    paddingTop: 8,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    paginationSpinner: {
      paddingVertical: 12,
      alignItems: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
    },
    emptyText: {
      color: theme.colors.textFaint,
    },
  });
