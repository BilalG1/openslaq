import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  RefreshControl,
  Switch,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import type { ChannelId, MobileTheme } from "@openslaq/shared";
import {
  browseChannels,
  joinChannel as coreJoinChannel,
  unarchiveChannel,
  type BrowseChannel,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useServer } from "@/contexts/ServerContext";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { routes } from "@/lib/routes";
import { Lock } from "lucide-react-native";

export default function BrowseChannelsScreen() {
  const { workspaceSlug } = useWorkspaceParams();
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const { state, dispatch } = useChatStore();
  const { socket } = useSocket();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);

  const [channels, setChannels] = useState<BrowseChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const workspace = state.workspaces?.find((w) => w.slug === workspaceSlug);
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";

  const memberChannelIds = new Set(state.channels.map((c) => c.id));

  const fetchChannels = useCallback(async (includeArchived = false) => {
    const deps = { api, auth: authProvider };
    const result = await browseChannels(deps, workspaceSlug!, includeArchived);
    setChannels(result);
  }, [authProvider, workspaceSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChannels(showArchived)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load channels");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetchChannels, showArchived]);

  // Re-fetch channel list when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        fetchChannels(showArchived).catch(() => {});
      }
    }, [fetchChannels, showArchived, loading]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChannels(showArchived).catch(() => {});
    setRefreshing(false);
  }, [fetchChannels, showArchived]);

  const handleUnarchive = useCallback(
    async (channelId: ChannelId) => {
      setUnarchivingId(channelId);
      const deps = { api, auth: authProvider, dispatch, getState: () => stateRef.current };
      try {
        await unarchiveChannel(deps, { workspaceSlug: workspaceSlug!, channelId });
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId ? { ...ch, isArchived: false } : ch,
          ),
        );
      } catch {
        // Ignore
      } finally {
        setUnarchivingId(null);
      }
    },
    [authProvider, dispatch, workspaceSlug],
  );

  const handleJoin = useCallback(
    async (channelId: ChannelId) => {
      setJoiningId(channelId);
      const deps = { api, auth: authProvider, dispatch, getState: () => stateRef.current };
      try {
        const browseChannel = channels.find((ch) => ch.id === channelId);
        await coreJoinChannel(deps, {
          workspaceSlug: workspaceSlug!,
          channelId,
          socket,
          channel: browseChannel,
        });
        // Update local browse list
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId ? { ...ch, isMember: true } : ch,
          ),
        );
        router.push(routes.channel(workspaceSlug!, channelId));
      } catch {
        // Ignore — user will see the channel unchanged
      } finally {
        setJoiningId(null);
      }
    },
    [authProvider, dispatch, router, socket, workspaceSlug],
  );

  const withMembership = channels.map((c) => ({
    ...c,
    isMember: memberChannelIds.has(c.id),
  }));

  const filtered = filter
    ? withMembership.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : withMembership;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          testID="browse-retry"
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchChannels(showArchived)
              .catch((e) => setError(e instanceof Error ? e.message : "Failed to load channels"))
              .finally(() => setLoading(false));
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          accessibilityHint="Retries loading channels"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 6,
          })}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TextInput
          testID="browse-channel-filter"
          placeholder="Filter channels..."
          placeholderTextColor={theme.colors.textFaint}
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.filterInput}
          accessibilityLabel="Filter channels"
          accessibilityHint="Type to filter the channel list"
        />
        <View style={styles.archivedRow}>
          <Text style={styles.archivedLabel}>Show archived</Text>
          <Switch
            testID="browse-show-archived-toggle"
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ true: theme.brand.primary }}
          />
        </View>
      </View>
      <FlatList
        testID="browse-channel-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item, index }) => (
          <View
            testID={`browse-channel-row-${index}`}
            style={styles.channelRow}
          >
            {item.type === "private" ? <Lock size={16} color={theme.colors.textMuted} testID={`browse-lock-icon-${item.id}`} /> : <Text style={styles.hashIcon}>#</Text>}
            <View style={styles.channelInfo}>
              <View style={styles.channelNameRow}>
                <Text style={styles.channelName}>{item.name}</Text>
                {item.isArchived && (
                  <View
                    testID={`browse-archived-badge-${item.id}`}
                    style={styles.archivedBadge}
                  >
                    <Text style={styles.archivedBadgeText}>Archived</Text>
                  </View>
                )}
              </View>
              <Text style={styles.memberCount}>
                {item.memberCount ?? 0} {(item.memberCount ?? 0) === 1 ? "member" : "members"}
              </Text>
            </View>
            {item.isArchived && isAdmin ? (
              <Pressable
                testID={`browse-unarchive-${item.id}`}
                onPress={() => handleUnarchive(item.id)}
                disabled={unarchivingId === item.id}
                accessibilityRole="button"
                accessibilityLabel={`Unarchive ${item.name}`}
                accessibilityHint="Unarchives this channel"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: theme.colors.borderDefault,
                  opacity: unarchivingId === item.id ? 0.6 : 1,
                })}
              >
                {unarchivingId === item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                ) : (
                  <Text style={styles.unarchiveText}>Unarchive</Text>
                )}
              </Pressable>
            ) : item.isArchived ? (
              <Text style={styles.statusText}>Archived</Text>
            ) : item.isMember ? (
              <Text style={styles.statusText}>Joined</Text>
            ) : (
              <Pressable
                testID={`browse-join-${item.id}`}
                onPress={() => handleJoin(item.id)}
                disabled={joiningId === item.id}
                accessibilityRole="button"
                accessibilityLabel={`Join ${item.name}`}
                accessibilityHint="Joins this channel"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 6,
                  opacity: joiningId === item.id ? 0.6 : 1,
                })}
              >
                {joiningId === item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.headerText} />
                ) : (
                  <Text style={styles.joinButtonText}>Join</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter ? "No channels match your filter" : "No public channels"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      padding: 24,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textFaint,
      textAlign: "center",
      marginBottom: 12,
    },
    retryButtonText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 14,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    filterInput: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    archivedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    archivedLabel: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    hashIcon: {
      color: theme.colors.textFaint,
      fontSize: 16,
      marginRight: 8,
    },
    channelInfo: {
      flex: 1,
    },
    channelNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    channelName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    archivedBadge: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    archivedBadgeText: {
      color: theme.colors.textFaint,
      fontSize: 11,
      fontWeight: "600",
    },
    memberCount: {
      color: theme.colors.textFaint,
      fontSize: 12,
    },
    unarchiveText: {
      color: theme.colors.textSecondary,
      fontWeight: "600",
      fontSize: 14,
    },
    statusText: {
      color: theme.colors.textFaint,
      fontSize: 14,
      fontWeight: "500",
    },
    joinButtonText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 14,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
    },
    emptyText: {
      color: theme.colors.textFaint,
    },
  });
