import { Pressable, Text, View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import type { Message, MessageId } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatTime } from "@/lib/time";

interface Props {
  visible: boolean;
  messages: Message[];
  loading: boolean;
  onUnpin: (messageId: MessageId) => void;
  onClose: () => void;
}

export function PinnedMessagesSheet({ visible, messages, loading, onUnpin, onClose }: Props) {
  const { theme } = useMobileTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Pinned Messages" scrollable maxHeight="70%" testID="pinned-sheet-content">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator testID="pinned-loading" size="large" color={theme.brand.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View testID="pinned-empty" style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.textFaint }}>No pinned messages</Text>
        </View>
      ) : (
        <FlatList
          testID="pinned-messages-list"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              testID={`pinned-message-${item.id}`}
              style={[styles.messageRow, { borderBottomColor: theme.colors.borderDefault }]}
            >
              <View style={styles.headerRow}>
                <View style={styles.senderRow}>
                  <Text style={[styles.senderName, { color: theme.colors.textPrimary }]}>
                    {item.senderDisplayName ?? "Unknown"}
                  </Text>
                  <Text style={[styles.timeText, { color: theme.colors.textFaint }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                <Pressable
                  testID={`unpin-button-${item.id}`}
                  onPress={() => onUnpin(item.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Unpin message"
                  accessibilityHint="Removes the pin from this message"
                >
                  <Text style={[styles.unpinText, { color: theme.brand.primary }]}>Unpin</Text>
                </Pressable>
              </View>
              <Text
                style={[styles.contentText, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.content}
              </Text>
            </View>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  messageRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 12,
    marginLeft: 6,
  },
  unpinText: {
    fontSize: 13,
  },
  contentText: {
    fontSize: 14,
  },
});
