import { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { NewDmModal } from "@/components/NewDmModal";
import { formatRelativeTime } from "@/lib/time";
import { useServer } from "@/contexts/ServerContext";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { routes } from "@/lib/routes";
import type { MobileTheme, UserId } from "@openslaq/shared";

export default function DmListScreen() {
  const router = useRouter();
  const { workspaceSlug: urlSlug } = useWorkspaceParams();
  const { authProvider, user } = useAuth();
  const { apiClient: api } = useServer();
  const { state, dispatch } = useChatStore();
  const workspaceSlug = urlSlug || state.workspaceSlug || "";
  const { theme } = useMobileTheme();
  const [showNewDm, setShowNewDm] = useState(false);
  const deps = { api, auth: authProvider, dispatch, getState: () => state };
  const s = makeStyles(theme);

  if (state.ui.bootstrapLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.surface }}>
      <FlatList
        data={state.dms}
        keyExtractor={(item) => item.channel.id}
        style={{ backgroundColor: theme.colors.surface }}
        contentContainerStyle={s.contentContainer}
        ItemSeparatorComponent={() => (
          <View className="ml-[60px]" style={[s.separator, { backgroundColor: theme.colors.borderSecondary }]} />
        )}
        renderItem={({ item }) => {
          const unread = state.unreadCounts[item.channel.id] ?? 0;
          const presence = state.presence[item.otherUser.id];
          const isOnline = presence?.online === true;
          const displayName = item.otherUser.displayName ?? "Unknown";

          // Get last message: prefer loaded messages, fall back to bootstrap preview
          const messageIds = state.channelMessageIds[item.channel.id];
          const lastMsgId = messageIds?.[messageIds.length - 1];
          const loadedMsg = lastMsgId ? state.messagesById[lastMsgId] : undefined;
          const lastMsgContent = loadedMsg?.content ?? item.lastMessageContent;
          const lastMsgTime = loadedMsg?.createdAt ?? item.lastMessageAt;

          return (
            <Pressable
              accessibilityLabel={`Direct message with ${displayName}`}
              accessibilityHint="Opens conversation"
              onPress={() =>
                router.push(routes.dm(workspaceSlug, item.channel.id))
              }
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
              })}
            >
              <View style={s.row}>
                {/* Avatar */}
                <View style={s.avatarWrapper}>
                  <View
                    style={[s.avatar, { backgroundColor: theme.colors.avatarFallbackBg }]}
                  >
                    <Text className="text-base font-semibold" style={{ color: theme.colors.avatarFallbackText }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  {isOnline && (
                    <View
                      style={[s.presenceDot, {
                        backgroundColor: theme.brand.success,
                        borderColor: theme.colors.surface,
                      }]}
                    />
                  )}
                </View>

                {/* Name + snippet */}
                <View style={s.textWrapper}>
                  <View style={s.nameRow}>
                    <Text
                      className={`text-[15px] ${unread > 0 ? "font-bold" : "font-medium"}`}
                      style={[s.nameText, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    {lastMsgTime && (
                      <Text className="text-xs" style={{ color: theme.colors.textFaint }}>
                        {formatRelativeTime(lastMsgTime)}
                      </Text>
                    )}
                  </View>
                  <View style={s.snippetRow}>
                    <Text
                      className={`text-[13px] ${unread > 0 ? "font-medium" : ""}`}
                      style={[s.snippetText, { color: unread > 0 ? theme.colors.textSecondary : theme.colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {lastMsgContent ?? "No messages yet"}
                    </Text>
                    {unread > 0 && (
                      <View
                        style={[s.badge, { backgroundColor: theme.interaction.badgeUnreadBg }]}
                      >
                        <Text className="text-[11px] font-bold" style={{ color: theme.interaction.badgeUnreadText }}>
                          {unread > 99 ? "99+" : unread}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable accessibilityRole="button"
            testID="new-dm-row"
            onPress={() => setShowNewDm(true)}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
            })}
          >
            <View style={s.row}>
              <View
                style={[s.newDmIcon, { backgroundColor: theme.brand.primary + "12" }]}
              >
                <Text className="text-lg" style={{ color: theme.brand.primary }}>+</Text>
              </View>
              <Text className="text-[15px]" style={{ color: theme.brand.primary }}>
                Start a new message
              </Text>
            </View>
          </Pressable>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text style={{ color: theme.colors.textFaint }}>No conversations yet</Text>
          </View>
        }
      />
      <NewDmModal
        visible={showNewDm}
        onClose={() => setShowNewDm(false)}
        workspaceSlug={workspaceSlug}
        currentUserId={(user?.id ?? "") as UserId}
        deps={deps}
        onCreated={(channelId) => {
          setShowNewDm(false);
          router.push(routes.dm(workspaceSlug, channelId));
        }}
        onChannelSelected={(channelId) => {
          setShowNewDm(false);
          router.push(routes.channel(workspaceSlug, channelId));
        }}
      />
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
    },
    separator: {
      height: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarWrapper: {
      width: 40,
      marginRight: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    presenceDot: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
    },
    textWrapper: {
      flex: 1,
      marginRight: 8,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    nameText: {
      flex: 1,
      marginRight: 8,
    },
    snippetRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    snippetText: {
      flex: 1,
    },
    badge: {
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    newDmIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
  });
