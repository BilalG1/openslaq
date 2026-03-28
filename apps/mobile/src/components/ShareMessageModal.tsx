import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { Lock, Check } from "lucide-react-native";
import type { Channel, ChannelId, Message } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatTime } from "@/lib/time";
import { buildDestinationItems } from "@/lib/destination-items";

import { TRANSPARENT } from "@/theme/constants";

interface Props {
  visible: boolean;
  message: Message | null;
  channels: Channel[];
  dms: DmConversation[];
  groupDms: GroupDmConversation[];
  onShare: (destinationChannelId: ChannelId, destinationName: string, comment: string) => void;
  onClose: () => void;
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

  const items = useMemo(
    () => buildDestinationItems(channels, dms, groupDms),
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
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard maxHeight="80%" testID="share-message-modal">
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Share message
        </Text>
        <Pressable
          testID="share-message-button"
          onPress={handleShare}
          disabled={!selectedId}
          accessibilityRole="button"
          accessibilityLabel="Share"
          accessibilityHint="Shares the message to the selected destination"
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: theme.brand.primary,
            opacity: !selectedId ? 0.4 : pressed ? 0.7 : 1,
          })}
        >
          <Text style={[styles.shareButtonText, { color: theme.colors.headerText }]}>
            Share
          </Text>
        </Pressable>
      </View>

      {/* Message preview */}
      <View
        testID="share-message-preview"
        style={[styles.messagePreview, {
          borderLeftColor: theme.brand.primary,
          backgroundColor: theme.colors.surfaceSecondary,
        }]}
      >
        <View style={styles.previewHeader}>
          <View
            style={[styles.avatar, { backgroundColor: theme.colors.surfaceTertiary }]}
          >
            <Text style={[styles.avatarText, { color: theme.colors.textMuted }]}>
              {initial}
            </Text>
          </View>
          <Text
            testID="share-preview-sender"
            style={[styles.senderName, { color: theme.colors.textPrimary }]}
          >
            {message.senderDisplayName}
          </Text>
          <Text style={[styles.timeText, { color: theme.colors.textFaint }]}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
        <Text
          testID="share-preview-content"
          style={[styles.contentText, { color: theme.colors.textPrimary }]}
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
        accessibilityLabel="Comment"
        accessibilityHint="Add an optional comment to the shared message"
        style={[styles.commentInput, {
          borderColor: theme.colors.borderDefault,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSecondary,
        }]}
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
        accessibilityLabel="Search destinations"
        accessibilityHint="Search for channels and people to share with"
        style={[styles.searchInput, {
          borderColor: theme.colors.borderDefault,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSecondary,
        }]}
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
              accessibilityRole="button"
              accessibilityLabel={`${item.type === "dm" ? "Direct message" : "Channel"} ${item.name}`}
              accessibilityHint={`Selects ${item.name} as the share destination`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isSelected
                  ? theme.colors.surfaceSecondary
                  : TRANSPARENT,
              })}
            >
              <View style={styles.prefixContainer}>
                {item.type === "private" ? (
                  <Lock size={14} color={theme.colors.textFaint} />
                ) : (
                  <Text style={[styles.prefixText, { color: theme.colors.textFaint }]}>
                    {item.type === "dm" ? "@" : "#"}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.destinationName, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {isSelected && (
                <Check
                  testID={`share-destination-check-${item.id}`}
                  size={16}
                  color={theme.brand.primary}
                />
              )}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  messagePreview: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "600",
  },
  senderName: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 11,
    marginLeft: 6,
  },
  contentText: {
    fontSize: 14,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 80,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  prefixContainer: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  prefixText: {
    fontSize: 14,
  },
  destinationName: {
    fontSize: 16,
    flex: 1,
  },
});
