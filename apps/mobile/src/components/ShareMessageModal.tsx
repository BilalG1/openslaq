import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Channel, Message } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface PickerItem {
  id: string;
  name: string;
  type: "public" | "private" | "dm";
}

interface Props {
  visible: boolean;
  message: Message | null;
  channels: Channel[];
  dms: DmConversation[];
  groupDms: GroupDmConversation[];
  onShare: (destinationChannelId: string, destinationName: string, comment: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ShareMessageModal({
  visible,
  message,
  channels,
  dms,
  groupDms,
  onShare,
  onClose,
}: Props) {
  const { theme } = useMobileTheme();
  const [filterText, setFilterText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (visible) {
      setFilterText("");
      setSelectedId(null);
      setComment("");
    }
  }, [visible]);

  const items: PickerItem[] = useMemo(
    () => [
      ...channels.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as "public" | "private",
      })),
      ...dms.map((dm) => ({
        id: dm.channel.id,
        name: dm.otherUser.displayName,
        type: "dm" as const,
      })),
      ...groupDms.map((g) => ({
        id: g.channel.id,
        name:
          g.channel.displayName ??
          g.members.map((m) => m.displayName).join(", "),
        type: "dm" as const,
      })),
    ],
    [channels, dms, groupDms],
  );

  const filtered = filterText
    ? items.filter((item) =>
        item.name.toLowerCase().includes(filterText.toLowerCase()),
      )
    : items;

  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId)
    : null;

  const handleShare = useCallback(() => {
    if (!selectedItem) return;
    onShare(selectedItem.id, selectedItem.name, comment);
  }, [selectedItem, comment, onShare]);

  if (!message) return null;

  const initial =
    message.senderDisplayName?.charAt(0)?.toUpperCase() || "?";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID="share-message-backdrop"
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            testID="share-message-modal"
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 16,
              paddingBottom: 34,
              maxHeight: "80%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.textPrimary,
                }}
              >
                Share message
              </Text>
              <Pressable
                testID="share-message-button"
                onPress={handleShare}
                disabled={!selectedId}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: theme.brand.primary,
                  opacity: !selectedId ? 0.4 : pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}
                >
                  Share
                </Text>
              </Pressable>
            </View>

            {/* Message preview */}
            <View
              testID="share-message-preview"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: theme.brand.primary,
                borderRadius: 6,
                backgroundColor: theme.colors.surfaceSecondary,
                padding: 10,
                marginHorizontal: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: theme.colors.surfaceTertiary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: theme.colors.textMuted,
                    }}
                  >
                    {initial}
                  </Text>
                </View>
                <Text
                  testID="share-preview-sender"
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: theme.colors.textPrimary,
                  }}
                >
                  {message.senderDisplayName}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: theme.colors.textFaint,
                    marginLeft: 6,
                  }}
                >
                  {formatTime(message.createdAt)}
                </Text>
              </View>
              <Text
                testID="share-preview-content"
                style={{ fontSize: 14, color: theme.colors.textPrimary }}
                numberOfLines={3}
              >
                {message.content}
              </Text>
            </View>

            {/* Comment input */}
            <TextInput
              testID="share-comment-input"
              value={comment}
              onChangeText={setComment}
              placeholder="Add a message (optional)"
              placeholderTextColor={theme.colors.textFaint}
              multiline
              maxLength={10000}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceSecondary,
                marginHorizontal: 16,
                marginBottom: 8,
                maxHeight: 80,
              }}
            />

            {/* Search input */}
            <TextInput
              testID="share-search-input"
              value={filterText}
              onChangeText={setFilterText}
              placeholder="Search channels and people..."
              placeholderTextColor={theme.colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceSecondary,
                marginHorizontal: 16,
                marginBottom: 8,
              }}
            />

            {/* Destination list */}
            <FlatList
              testID="share-destination-list"
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <Pressable
                    testID={`share-destination-${item.id}`}
                    onPress={() => setSelectedId(item.id)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isSelected
                        ? theme.colors.surfaceSecondary
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.textFaint,
                        width: 24,
                      }}
                    >
                      {item.type === "private"
                        ? "\u{1F512}"
                        : item.type === "dm"
                          ? "@"
                          : "#"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.colors.textPrimary,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Text
                        testID={`share-destination-check-${item.id}`}
                        style={{
                          fontSize: 16,
                          color: theme.brand.primary,
                          fontWeight: "600",
                        }}
                      >
                        {"\u2713"}
                      </Text>
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
