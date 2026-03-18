import { useCallback, useRef, useState } from "react";
import { View, Text, SectionList, ActivityIndicator, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getAllDraftKeys } from "@/lib/draft-storage";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { ListRow } from "@/components/ui/ListRow";
import { CollapsibleSectionHeader } from "@/components/CollapsibleSectionHeader";
import { HomeHeader } from "@/components/home/HomeHeader";
import { QuickActionsRow } from "@/components/home/QuickActionsRow";
import { ChannelActionSheet } from "@/components/ChannelActionSheet";
import { useHomeActions } from "@/contexts/HomeActionsContext";
import { haptics } from "@/utils/haptics";
import {
  starChannelOp,
  unstarChannelOp,
  setChannelNotificationPrefOp,
  archiveChannel,
} from "@openslaq/client-core";
import type { Channel, ChannelId, ChannelNotifyLevel } from "@openslaq/shared";
import { Lock, Users } from "lucide-react-native";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";
import { routes } from "@/lib/routes";

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
  const { state, dispatch } = useChatStore();
  const { authProvider } = useAuth();
  const { theme } = useMobileTheme();
  const { openCreateChannel, openNewDm } = useHomeActions();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draftSet, setDraftSet] = useState<Set<string>>(new Set());
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // Ref for getState callback (avoids stale closures)
  const stateRef = useRef(state);
  stateRef.current = state;

  const operationDeps = {
    api,
    auth: authProvider,
    dispatch,
    getState: () => stateRef.current,
  };

  const workspace = state.workspaces?.find((w: { slug: string }) => w.slug === workspaceSlug);
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";

  const handleLongPressChannel = (channel: Channel) => {
    haptics.heavy();
    setSelectedChannel(channel);
    setActionSheetVisible(true);
  };

  const handleStar = (channelId: string) => {
    void starChannelOp(operationDeps, { slug: workspaceSlug, channelId });
  };

  const handleUnstar = (channelId: string) => {
    void unstarChannelOp(operationDeps, { slug: workspaceSlug, channelId });
  };

  const handleSetNotificationPref = (channelId: string, level: ChannelNotifyLevel) => {
    void setChannelNotificationPrefOp(operationDeps, { slug: workspaceSlug, channelId, level });
  };

  const handleArchiveChannel = (channelId: string) => {
    void archiveChannel(operationDeps, { workspaceSlug, channelId: channelId as ChannelId });
  };

  useFocusEffect(
    useCallback(() => {
      void getAllDraftKeys().then((keys) => setDraftSet(new Set(keys)));
    }, []),
  );

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
    if ((state.unreadCounts[ch.id] ?? 0) > 0 && !mutedSet.has(ch.id) && !ch.isArchived) {
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
    .filter((c) => starredSet.has(c.id) && !c.isArchived)
    .map((channel) => ({ kind: "channel" as const, channel }));

  // Regular channels (non-starred)
  const channelItems: HomeItem[] = state.channels
    .filter((c) => !starredSet.has(c.id) && !c.isArchived)
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
        keyExtractor={(item) => getItemKey(item)}
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
            const isPrivate = ch.type === "private";
            return (
              <Pressable
                testID={`channel-row-${ch.id}`}
                onPress={() =>
                  router.push(routes.channel(workspaceSlug, ch.id))
                }
                onLongPress={() => handleLongPressChannel(ch)}
              >
                <View style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 28, alignItems: "center", justifyContent: "center" }}>
                    {isPrivate ? <Lock size={16} color={theme.colors.textMuted} /> : <Text style={{ color: theme.colors.textMuted, fontSize: 18, fontWeight: "400" }}>#</Text>}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: unread > 0 ? "700" : "400",
                      color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary,
                    }}
                    numberOfLines={1}
                  >
                    {ch.name}
                  </Text>
                  {draftSet.has(ch.id) && (
                    <Text style={{ fontSize: 13, fontStyle: "italic", color: theme.colors.textMuted, marginRight: 6 }}>
                      Draft
                    </Text>
                  )}
                  {unread > 0 && (
                    <View
                      style={{ borderRadius: 9999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.interaction.badgeUnreadBg }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.interaction.badgeUnreadText }}>
                        {unread > 99 ? "99+" : unread}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }

          if (item.kind === "groupDm") {
            const { groupDm } = item;
            const unread = state.unreadCounts[groupDm.channel.id] ?? 0;
            const label = getGroupDmLabel(groupDm);

            return (
              <Pressable
                testID={`group-dm-row-${groupDm.channel.id}`}
                onPress={() =>
                  router.push(routes.dm(workspaceSlug, groupDm.channel.id))
                }
              >
                <View style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
                  <View style={{ marginRight: 12 }}>
                    <View
                      style={{ width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.avatarFallbackBg }}
                    >
                      <Users size={16} color={theme.colors.textMuted} />
                    </View>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: unread > 0 ? "700" : "400",
                      color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary,
                    }}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  {draftSet.has(groupDm.channel.id) && (
                    <Text style={{ fontSize: 13, fontStyle: "italic", color: theme.colors.textMuted, marginRight: 6 }}>
                      Draft
                    </Text>
                  )}
                  {unread > 0 && (
                    <View
                      style={{ borderRadius: 9999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.interaction.badgeUnreadBg }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.interaction.badgeUnreadText }}>
                        {unread > 99 ? "99+" : unread}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }

          // DM item
          const { dm } = item;
          const unread = state.unreadCounts[dm.channel.id] ?? 0;
          const presence = state.presence[dm.otherUser.id];
          const isOnline = presence?.online === true;

          return (
            <Pressable
              testID={`dm-row-${dm.channel.id}`}
              onPress={() =>
                router.push(routes.dm(workspaceSlug, dm.channel.id))
              }
            >
              <View style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
                <View style={{ position: "relative", marginRight: 12 }}>
                  <View
                    style={{ width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.avatarFallbackBg }}
                  >
                    <Text style={{ fontWeight: '500', color: theme.colors.avatarFallbackText }}>
                      {dm.otherUser.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  {isOnline && (
                    <View
                      style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 9999, borderWidth: 2, backgroundColor: theme.brand.success, borderColor: theme.colors.surface }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: unread > 0 ? "700" : "400",
                    color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {dm.otherUser.displayName ?? "Unknown"}
                </Text>
                {draftSet.has(dm.channel.id) && (
                  <Text style={{ fontSize: 13, fontStyle: "italic", color: theme.colors.textMuted, marginRight: 6 }}>
                    Draft
                  </Text>
                )}
                {unread > 0 && (
                  <View
                    style={{ borderRadius: 9999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.interaction.badgeUnreadBg }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.interaction.badgeUnreadText }}>
                      {unread > 99 ? "99+" : unread}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.key === "channels" && !collapsed.channels) {
            return (
              <ListRow
                testID="add-channel-link"
                onPress={() => {
                  Alert.alert("Add Channel", undefined, [
                    { text: "Create a Channel", onPress: openCreateChannel },
                    { text: "Browse Channels", onPress: () => router.push(routes.browse(workspaceSlug)) },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
              >
                <View style={{ width: 28, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 18, fontWeight: "300" }}>+</Text>
                </View>
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                  Add channel
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
                <View style={{ width: 28, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 18, fontWeight: "300" }}>+</Text>
                </View>
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                  Start a new message
                </Text>
              </ListRow>
            );
          }
          if (section.data.length === 0 && !collapsed[section.key] && section.key !== "unreads" && section.key !== "starred") {
            return (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
                <Text style={{ color: theme.colors.textFaint }}>
                  {section.key === "dms" ? "No conversations yet" : "No channels yet"}
                </Text>
              </View>
            );
          }
          return null;
        }}
      />
      <ChannelActionSheet
        visible={actionSheetVisible}
        channel={selectedChannel}
        isStarred={selectedChannel ? starredSet.has(selectedChannel.id) : false}
        isMuted={selectedChannel ? mutedSet.has(selectedChannel.id) : false}
        notifyLevel={selectedChannel ? (state.channelNotificationPrefs[selectedChannel.id] ?? "all") : "all"}
        isAdmin={isAdmin}
        onStar={handleStar}
        onUnstar={handleUnstar}
        onSetNotificationPref={handleSetNotificationPref}
        onArchive={handleArchiveChannel}
        onClose={() => setActionSheetVisible(false)}
      />
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
