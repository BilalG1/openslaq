import { useState, useRef, useEffect } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type React from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Lock, Users } from "lucide-react-native";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { Channel } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SwitcherItem {
  id: string;
  label: string;
  type: "channel" | "dm" | "groupDm";
  prefix: React.ReactNode;
  isOnline?: boolean;
  unreadCount: number;
  isStarred: boolean;
}

function buildItems(
  channels: Channel[],
  dms: DmConversation[],
  groupDms: GroupDmConversation[],
  unreadCounts: Record<string, number>,
  starredChannelIds: string[],
  presence: Record<string, { online: boolean }>,
): SwitcherItem[] {
  const starredSet = new Set(starredChannelIds);
  const items: SwitcherItem[] = [];

  for (const ch of channels) {
    items.push({
      id: ch.id,
      label: ch.name,
      type: "channel",
      prefix: ch.type === "private" ? <Lock size={16} color="#999" /> : "#",
      unreadCount: unreadCounts[ch.id] ?? 0,
      isStarred: starredSet.has(ch.id),
    });
  }

  for (const dm of dms) {
    const p = presence[dm.otherUser.id];
    items.push({
      id: dm.channel.id,
      label: dm.otherUser.displayName ?? "Unknown",
      type: "dm",
      prefix: "@",
      isOnline: p?.online === true,
      unreadCount: unreadCounts[dm.channel.id] ?? 0,
      isStarred: false,
    });
  }

  for (const groupDm of groupDms) {
    const label =
      groupDm.channel.displayName ??
      groupDm.members.map((m) => m.displayName).join(", ");
    items.push({
      id: groupDm.channel.id,
      label,
      type: "groupDm",
      prefix: <Users size={16} color="#999" />,
      unreadCount: unreadCounts[groupDm.channel.id] ?? 0,
      isStarred: false,
    });
  }

  return items;
}

function sortDefault(items: SwitcherItem[]): SwitcherItem[] {
  return [...items].sort((a, b) => {
    // Unread first
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    // Starred second
    if (a.isStarred && !b.isStarred) return -1;
    if (!a.isStarred && b.isStarred) return 1;
    // Alphabetical
    return a.label.localeCompare(b.label);
  });
}

export function QuickSwitcherModal({ visible, onClose }: Props) {
  const { theme } = useMobileTheme();
  const { state } = useChatStore();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const [filterText, setFilterText] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setFilterText("");
    }
  }, [visible]);

  const allItems = buildItems(
    state.channels,
    state.dms,
    state.groupDms,
    state.unreadCounts,
    state.starredChannelIds,
    state.presence,
  );

  const query = filterText.trim().toLowerCase();
  const filtered = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query))
    : sortDefault(allItems);

  const handleSelect = (item: SwitcherItem) => {
    if (item.type === "channel") {
      router.push(`/(app)/${workspaceSlug}/(channels)/${item.id}`);
    } else {
      router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${item.id}`);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID="quick-switcher-backdrop"
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          testID="quick-switcher-modal"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 16,
            paddingBottom: 34,
            maxHeight: "70%",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.textPrimary,
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            Jump to...
          </Text>
          <TextInput
            ref={inputRef}
            testID="quick-switcher-input"
            placeholder="Search channels, people..."
            placeholderTextColor={theme.colors.textFaint}
            value={filterText}
            onChangeText={setFilterText}
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
          <FlatList
            testID="quick-switcher-list"
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                testID={`quick-switcher-item-${item.id}`}
                onPress={() => handleSelect(item)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                })}
              >
                <View style={{ width: 28, alignItems: "center", justifyContent: "center" }}>
                  {typeof item.prefix === "string" ? (
                    <Text style={{ color: theme.colors.textMuted, fontSize: 18, fontWeight: "400" }}>
                      {item.prefix}
                    </Text>
                  ) : (
                    item.prefix
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: item.unreadCount > 0 ? "700" : "400",
                    color:
                      item.unreadCount > 0
                        ? theme.colors.textPrimary
                        : theme.colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.type === "dm" && item.isOnline && (
                  <View
                    testID={`online-dot-${item.id}`}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.brand.success,
                      marginRight: 8,
                    }}
                  />
                )}
                {item.unreadCount > 0 && (
                  <View
                    style={{
                      backgroundColor: theme.interaction.badgeUnreadBg,
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.interaction.badgeUnreadText,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Text style={{ color: theme.colors.textFaint, fontSize: 14 }}>
                  No results found
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
