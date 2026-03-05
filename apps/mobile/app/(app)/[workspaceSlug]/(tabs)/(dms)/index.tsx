import { View, Text, FlatList } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { ListRow } from "@/components/ui/ListRow";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";

type DmItem =
  | { kind: "dm"; dm: DmConversation }
  | { kind: "groupDm"; groupDm: GroupDmConversation };

export default function DmsScreen() {
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { theme } = useMobileTheme();

  const items: DmItem[] = [
    ...state.dms.map((dm) => ({ kind: "dm" as const, dm })),
    ...state.groupDms.map((groupDm) => ({ kind: "groupDm" as const, groupDm })),
  ];

  const getItemKey = (item: DmItem): string => {
    return item.kind === "dm" ? item.dm.channel.id : item.groupDm.channel.id;
  };

  const getGroupDmLabel = (groupDm: GroupDmConversation): string => {
    return groupDm.channel.displayName ?? groupDm.members.map((m) => m.displayName).join(", ");
  };

  if (items.length === 0) {
    return (
      <View
        testID="dms-screen"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text style={{ color: theme.colors.textFaint }}>No conversations yet</Text>
      </View>
    );
  }

  return (
    <View testID="dms-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <FlatList
        data={items}
        keyExtractor={(item) => getItemKey(item)}
        renderItem={({ item }) => {
          if (item.kind === "groupDm") {
            const { groupDm } = item;
            const unread = state.unreadCounts[groupDm.channel.id] ?? 0;
            return (
              <ListRow
                testID={`group-dm-row-${groupDm.channel.id}`}
                onPress={() =>
                  router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${groupDm.channel.id}`)
                }
              >
                <View style={{ marginRight: 12 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.colors.avatarFallbackBg,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{"\uD83D\uDC65"}</Text>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: unread > 0 ? "700" : "400",
                    color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary,
                  }}
                >
                  {getGroupDmLabel(groupDm)}
                </Text>
                {unread > 0 && (
                  <View
                    style={{
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.interaction.badgeUnreadBg,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: theme.interaction.badgeUnreadText }}>
                      {unread > 99 ? "99+" : unread}
                    </Text>
                  </View>
                )}
              </ListRow>
            );
          }

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
              <View style={{ position: "relative", marginRight: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.avatarFallbackBg,
                  }}
                >
                  <Text style={{ fontWeight: "500", color: theme.colors.avatarFallbackText }}>
                    {dm.otherUser.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                {isOnline && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      borderWidth: 2,
                      backgroundColor: theme.brand.success,
                      borderColor: theme.colors.surface,
                    }}
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
              >
                {dm.otherUser.displayName ?? "Unknown"}
              </Text>
              {unread > 0 && (
                <View
                  style={{
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.interaction.badgeUnreadBg,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.interaction.badgeUnreadText }}>
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              )}
            </ListRow>
          );
        }}
      />
    </View>
  );
}
