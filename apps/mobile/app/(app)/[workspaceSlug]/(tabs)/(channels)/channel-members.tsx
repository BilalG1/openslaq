import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  listChannelMembers,
  addChannelMember,
  removeChannelMember,
  listWorkspaceMembers,
  type ChannelMember,
  type WorkspaceMember,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

export default function ChannelMembersScreen() {
  const { workspaceSlug, channelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [channelMembersList, setChannelMembersList] = useState<ChannelMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);

  const channel = state.channels.find((c) => c.id === channelId);
  const isPrivate = channel?.type === "private";
  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const canManage =
    isPrivate &&
    (channel?.createdBy === user?.id ||
      currentWorkspace?.role === "admin" ||
      currentWorkspace?.role === "owner");

  const apiDeps = { api, auth: authProvider };
  const opDeps = { api, auth: authProvider, dispatch, getState: () => state };

  const fetchMembers = useCallback(async () => {
    if (!workspaceSlug || !channelId) return;
    const members = await listChannelMembers(apiDeps, workspaceSlug, channelId);
    setChannelMembersList(members);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, channelId, authProvider]);

  const fetchWorkspaceMembers = useCallback(async () => {
    if (!workspaceSlug) return;
    const members = await listWorkspaceMembers(opDeps, workspaceSlug);
    setWorkspaceMembers(members);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, authProvider]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMembers(), fetchWorkspaceMembers()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchMembers, fetchWorkspaceMembers]);

  const handleRemove = useCallback(
    (memberId: string, memberName: string) => {
      Alert.alert("Remove Member", `Remove ${memberName} from this channel?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeChannelMember(apiDeps, workspaceSlug, channelId, memberId);
            setChannelMembersList((prev) => prev.filter((m) => m.id !== memberId));
          },
        },
      ]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceSlug, channelId, authProvider],
  );

  const handleAdd = useCallback(
    async (memberId: string) => {
      await addChannelMember(apiDeps, workspaceSlug, channelId, memberId);
      await fetchMembers();
      setAddMode(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceSlug, channelId, authProvider, fetchMembers],
  );

  const memberIds = new Set(channelMembersList.map((m) => m.id));
  const nonMembers = workspaceMembers.filter((m) => !memberIds.has(m.id));

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  const dataToShow: Array<{ id: string; displayName: string; email: string; avatarUrl: string | null }> = addMode ? nonMembers : channelMembersList;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {canManage && (
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable
            testID="member-add-button"
            onPress={() => setAddMode(!addMode)}
          >
            <Text style={{ color: theme.brand.primary, fontSize: 16, fontWeight: "500" }}>
              {addMode ? "Done" : "Add Member"}
            </Text>
          </Pressable>
        </View>
      )}
      <FlatList
        testID="members-list"
        data={dataToShow}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const rowContent = (
            <View
              testID={`member-row-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.borderSecondary,
              }}
            >
              {/* Avatar initials */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.surfaceTertiary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 14 }}>
                  {(item.displayName || item.email)?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>{item.displayName}</Text>
                <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>{item.email}</Text>
              </View>
              {addMode ? (
                <Pressable
                  onPress={() => handleAdd(item.id)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 6,
                  })}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Add</Text>
                </Pressable>
              ) : (
                canManage &&
                item.id !== channel?.createdBy && (
                  <Pressable
                    testID={`member-remove-${item.id}`}
                    onPress={() => handleRemove(item.id, item.displayName)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? theme.brand.danger + "22" : "transparent",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: theme.brand.danger,
                    })}
                  >
                    <Text style={{ color: theme.brand.danger, fontWeight: "500", fontSize: 14 }}>Remove</Text>
                  </Pressable>
                )
              )}
            </View>
          );

          if (addMode) return rowContent;

          return (
            <Pressable
              onPress={() => router.push(routes.profile(workspaceSlug, item.id))}
            >
              {rowContent}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ color: theme.colors.textFaint }}>
              {addMode ? "All workspace members are already in this channel" : "No members"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
