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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ChannelId } from "@openslaq/shared";
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
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

export default function BrowseChannelsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const { socket } = useSocket();
  const router = useRouter();
  const { theme } = useMobileTheme();

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

  const workspace = state.workspaces?.find((w: { slug: string }) => w.slug === workspaceSlug);
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";

  const fetchChannels = useCallback(async (includeArchived = false) => {
    const deps = { api, auth: authProvider };
    const result = await browseChannels(deps, workspaceSlug, includeArchived);
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
        await unarchiveChannel(deps, { workspaceSlug, channelId });
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
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      try {
        await coreJoinChannel(deps, {
          workspaceSlug,
          channelId,
          socket,
        });
        // Update local browse list
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId ? { ...ch, isMember: true } : ch,
          ),
        );
        router.push(routes.channel(workspaceSlug, channelId));
      } catch {
        // Ignore — user will see the channel unchanged
      } finally {
        setJoiningId(null);
      }
    },
    [authProvider, dispatch, router, socket, state, workspaceSlug],
  );

  const filtered = filter
    ? channels.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : channels;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, padding: 24 }}>
        <Text style={{ fontSize: 14, color: theme.colors.textFaint, textAlign: "center", marginBottom: 12 }}>{error}</Text>
        <Pressable
          testID="browse-retry"
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchChannels(showArchived)
              .catch((e) => setError(e instanceof Error ? e.message : "Failed to load channels"))
              .finally(() => setLoading(false));
          }}
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 6,
          })}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
        <TextInput
          testID="browse-channel-filter"
          placeholder="Filter channels..."
          placeholderTextColor={theme.colors.textFaint}
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 14,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surfaceSecondary,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Show archived</Text>
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
            }}
          >
            <Text style={{ color: theme.colors.textFaint, fontSize: 16, marginRight: 8 }}>#</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>{item.name}</Text>
                {item.isArchived && (
                  <View
                    testID={`browse-archived-badge-${item.id}`}
                    style={{
                      backgroundColor: theme.colors.surfaceTertiary,
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: theme.colors.textFaint, fontSize: 11, fontWeight: "600" }}>Archived</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
                {item.memberCount ?? 0} {(item.memberCount ?? 0) === 1 ? "member" : "members"}
              </Text>
            </View>
            {item.isArchived && isAdmin ? (
              <Pressable
                testID={`browse-unarchive-${item.id}`}
                onPress={() => handleUnarchive(item.id)}
                disabled={unarchivingId === item.id}
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
                  <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 14 }}>Unarchive</Text>
                )}
              </Pressable>
            ) : item.isArchived ? (
              <Text style={{ color: theme.colors.textFaint, fontSize: 14, fontWeight: "500" }}>Archived</Text>
            ) : item.isMember ? (
              <Text style={{ color: theme.colors.textFaint, fontSize: 14, fontWeight: "500" }}>Joined</Text>
            ) : (
              <Pressable
                testID={`browse-join-${item.id}`}
                onPress={() => handleJoin(item.id)}
                disabled={joiningId === item.id}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 6,
                  opacity: joiningId === item.id ? 0.6 : 1,
                })}
              >
                {joiningId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Join</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ color: theme.colors.textFaint }}>
              {filter ? "No channels match your filter" : "No public channels"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
