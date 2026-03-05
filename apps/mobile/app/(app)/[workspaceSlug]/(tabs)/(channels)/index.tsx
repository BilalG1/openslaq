import { useState } from "react";
import { View, Text, SectionList, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { ListRow } from "@/components/ui/ListRow";
import { CollapsibleSectionHeader } from "@/components/CollapsibleSectionHeader";
import { HomeHeader } from "@/components/home/HomeHeader";
import { QuickActionsRow } from "@/components/home/QuickActionsRow";
import { useHomeActions } from "@/contexts/HomeActionsContext";
import type { Channel } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";

type HomeItem =
  | { kind: "channel"; channel: Channel }
  | { kind: "dm"; dm: DmConversation }
  | { kind: "groupDm"; groupDm: GroupDmConversation };

interface HomeSection {
  key: string;
  title: string;
  data: HomeItem[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { theme } = useMobileTheme();
  const { openCreateChannel, openNewDm } = useHomeActions();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (state.ui.bootstrapLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (state.ui.bootstrapError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface, paddingHorizontal: 16 }]}>
        <Text style={{ color: theme.colors.dangerText, textAlign: "center" }}>{state.ui.bootstrapError}</Text>
      </View>
    );
  }

  const starredSet = new Set(state.starredChannelIds);
  const mutedSet = new Set(
    Object.entries(state.channelNotificationPrefs)
      .filter(([, level]) => level === "muted")
      .map(([id]) => id),
  );

  // Unreads: channels + DMs + group DMs with unread > 0 and not muted
  const unreadItems: HomeItem[] = [];
  for (const ch of state.channels) {
    if ((state.unreadCounts[ch.id] ?? 0) > 0 && !mutedSet.has(ch.id)) {
      unreadItems.push({ kind: "channel", channel: ch });
    }
  }
  for (const dm of state.dms) {
    if ((state.unreadCounts[dm.channel.id] ?? 0) > 0 && !mutedSet.has(dm.channel.id)) {
      unreadItems.push({ kind: "dm", dm });
    }
  }
  for (const groupDm of state.groupDms) {
    if ((state.unreadCounts[groupDm.channel.id] ?? 0) > 0 && !mutedSet.has(groupDm.channel.id)) {
      unreadItems.push({ kind: "groupDm", groupDm });
    }
  }

  // Starred channels
  const starredItems: HomeItem[] = state.channels
    .filter((c) => starredSet.has(c.id))
    .map((channel) => ({ kind: "channel" as const, channel }));

  // Regular channels (non-starred)
  const channelItems: HomeItem[] = state.channels
    .filter((c) => !starredSet.has(c.id))
    .map((channel) => ({ kind: "channel" as const, channel }));

  // DMs + Group DMs
  const dmItems: HomeItem[] = [
    ...state.dms.map((dm) => ({ kind: "dm" as const, dm })),
    ...state.groupDms.map((groupDm) => ({ kind: "groupDm" as const, groupDm })),
  ];

  const sections: HomeSection[] = [
    ...(unreadItems.length > 0
      ? [{ key: "unreads", title: "Unreads", data: collapsed.unreads ? [] : unreadItems }]
      : []),
    ...(starredItems.length > 0
      ? [{ key: "starred", title: "Starred", data: collapsed.starred ? [] : starredItems }]
      : []),
    { key: "channels", title: "Channels", data: collapsed.channels ? [] : channelItems },
    { key: "dms", title: "Direct Messages", data: collapsed.dms ? [] : dmItems },
  ];

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getItemKey = (item: HomeItem): string => {
    if (item.kind === "channel") return item.channel.id;
    if (item.kind === "dm") return item.dm.channel.id;
    return item.groupDm.channel.id;
  };

  const getGroupDmLabel = (groupDm: GroupDmConversation): string => {
    return groupDm.channel.displayName ?? groupDm.members.map((m) => m.displayName).join(", ");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <HomeHeader />
      <SectionList
        testID="channel-list"
        sections={sections}
        keyExtractor={(item, index) => `${getItemKey(item)}-${index}`}
        ListHeaderComponent={<QuickActionsRow />}
        renderSectionHeader={({ section }) => (
          <CollapsibleSectionHeader
            sectionKey={section.key}
            title={section.title}
            collapsed={collapsed[section.key] ?? false}
            onToggle={() => toggleSection(section.key)}
            count={
              section.key === "unreads" ? unreadItems.length
                : section.key === "starred" ? starredItems.length
                : undefined
            }
          />
        )}
        renderItem={({ item }) => {
          if (item.kind === "channel") {
            const ch = item.channel;
            const unread = state.unreadCounts[ch.id] ?? 0;
            const icon = ch.type === "private" ? "\u{1F512}" : "#";
            return (
              <ListRow
                testID={`channel-row-${ch.id}`}
                onPress={() =>
                  router.push(`/(app)/${workspaceSlug}/(channels)/${ch.id}`)
                }
              >
                <Text className="mr-2 text-lg" style={{ color: theme.colors.textFaint }}>{icon}</Text>
                <Text
                  className={`flex-1 text-base ${unread > 0 ? "font-bold" : ""}`}
                  style={{ color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {ch.name}
                </Text>
                {unread > 0 && (
                  <View
                    className="rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center"
                    style={{ backgroundColor: theme.interaction.badgeUnreadBg }}
                  >
                    <Text className="text-xs font-bold" style={{ color: theme.interaction.badgeUnreadText }}>
                      {unread > 99 ? "99+" : unread}
                    </Text>
                  </View>
                )}
              </ListRow>
            );
          }

          if (item.kind === "groupDm") {
            const { groupDm } = item;
            const unread = state.unreadCounts[groupDm.channel.id] ?? 0;
            const label = getGroupDmLabel(groupDm);

            return (
              <ListRow
                testID={`group-dm-row-${groupDm.channel.id}`}
                onPress={() =>
                  router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${groupDm.channel.id}`)
                }
              >
                <View className="mr-3">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.colors.avatarFallbackBg }}
                  >
                    <Text style={{ fontSize: 16 }}>{"\uD83D\uDC65"}</Text>
                  </View>
                </View>
                <Text
                  className={`flex-1 text-base ${unread > 0 ? "font-bold" : ""}`}
                  style={{ color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {unread > 0 && (
                  <View
                    className="rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center"
                    style={{ backgroundColor: theme.interaction.badgeUnreadBg }}
                  >
                    <Text className="text-xs font-bold" style={{ color: theme.interaction.badgeUnreadText }}>
                      {unread > 99 ? "99+" : unread}
                    </Text>
                  </View>
                )}
              </ListRow>
            );
          }

          // DM item
          const { dm } = item;
          const unread = state.unreadCounts[dm.channel.id] ?? 0;
          const presence = state.presence[dm.otherUser.id];
          const isOnline = presence?.online === true;

          return (
            <ListRow
              testID={`dm-row-${dm.channel.id}`}
              onPress={() =>
                router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${dm.channel.id}`)
              }
            >
              <View className="relative mr-3">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.colors.avatarFallbackBg }}
                >
                  <Text className="font-medium" style={{ color: theme.colors.avatarFallbackText }}>
                    {dm.otherUser.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                {isOnline && (
                  <View
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: theme.brand.success, borderColor: theme.colors.surface }}
                  />
                )}
              </View>
              <Text
                className={`flex-1 text-base ${unread > 0 ? "font-bold" : ""}`}
                style={{ color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary }}
                numberOfLines={1}
              >
                {dm.otherUser.displayName ?? "Unknown"}
              </Text>
              {unread > 0 && (
                <View
                  className="rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center"
                  style={{ backgroundColor: theme.interaction.badgeUnreadBg }}
                >
                  <Text className="text-xs font-bold" style={{ color: theme.interaction.badgeUnreadText }}>
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              )}
            </ListRow>
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.key === "channels" && !collapsed.channels) {
            return (
              <ListRow
                testID="add-channel-link"
                onPress={openCreateChannel}
              >
                <Text className="text-base" style={{ color: theme.brand.primary }}>
                  + Add channel
                </Text>
              </ListRow>
            );
          }
          if (section.key === "dms" && !collapsed.dms) {
            return (
              <ListRow
                testID="new-dm-link"
                onPress={openNewDm}
              >
                <Text className="text-base" style={{ color: theme.brand.primary }}>
                  + Start a new message
                </Text>
              </ListRow>
            );
          }
          if (section.data.length === 0 && !collapsed[section.key] && section.key !== "unreads" && section.key !== "starred") {
            return (
              <View className="items-center justify-center py-12">
                <Text style={{ color: theme.colors.textFaint }}>
                  {section.key === "dms" ? "No conversations yet" : "No channels yet"}
                </Text>
              </View>
            );
          }
          return null;
        }}
      />
      {/* FAB */}
      <Pressable
        testID="fab-compose"
        onPress={openNewDm}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.brand.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -2 }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
