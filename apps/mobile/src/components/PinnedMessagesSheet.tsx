import { Pressable, Text, View, FlatList, ActivityIndicator } from "react-native";
import type { Message } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatTime } from "@/lib/time";

interface Props {
  visible: boolean;
  messages: Message[];
  loading: boolean;
  onUnpin: (messageId: string) => void;
  onClose: () => void;
}

export function PinnedMessagesSheet({ visible, messages, loading, onUnpin, onClose }: Props) {
  const { theme } = useMobileTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Pinned Messages" scrollable maxHeight="70%" testID="pinned-sheet-content">
      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <ActivityIndicator testID="pinned-loading" size="large" color={theme.brand.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View testID="pinned-empty" style={{ paddingVertical: 32, alignItems: "center" }}>
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
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.borderDefault,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary }}>
                    {item.senderDisplayName ?? "Unknown"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginLeft: 6 }}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                <Pressable
                  testID={`unpin-button-${item.id}`}
                  onPress={() => onUnpin(item.id)}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 13, color: theme.brand.primary }}>Unpin</Text>
                </Pressable>
              </View>
              <Text
                style={{ fontSize: 14, color: theme.colors.textSecondary }}
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
