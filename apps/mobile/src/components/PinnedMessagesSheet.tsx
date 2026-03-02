import { Modal, Pressable, Text, View, FlatList, ActivityIndicator } from "react-native";
import type { Message } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  visible: boolean;
  messages: Message[];
  loading: boolean;
  onUnpin: (messageId: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function PinnedMessagesSheet({ visible, messages, loading, onUnpin, onClose }: Props) {
  const { theme } = useMobileTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        testID="pinned-sheet-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          testID="pinned-sheet-content"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 34,
            paddingTop: 12,
            maxHeight: "70%",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary }}>
              Pinned Messages
            </Text>
            <Pressable testID="pinned-sheet-close" onPress={onClose} hitSlop={8}>
              <Text style={{ fontSize: 16, color: theme.colors.textMuted }}>Close</Text>
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault }} />

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
