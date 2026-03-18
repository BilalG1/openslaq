import { useState, useRef, useEffect } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import type { TextInput } from "react-native";
import type React from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Lock, Users } from "lucide-react-native";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import type { Channel } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";
import { routes } from "@/lib/routes";

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
      router.push(routes.channel(workspaceSlug!, item.id));
    } else {
      router.push(routes.dm(workspaceSlug!, item.id));
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Jump to..." maxHeight="70%" testID="quick-switcher-modal">
      <Input
        ref={inputRef}
        testID="quick-switcher-input"
        placeholder="Search channels, people..."
        placeholderTextColor={theme.colors.textFaint}
        value={filterText}
        onChangeText={setFilterText}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
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
            <UnreadBadge count={item.unreadCount} />
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
    </BottomSheet>
  );
}
