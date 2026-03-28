import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import type { MobileTheme } from "@openslaq/shared";
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
import { useServer } from "@/contexts/ServerContext";
import { useChannelMembersParams } from "@/hooks/useRouteParams";
import { routes } from "@/lib/routes";

export default function ChannelMembersScreen() {
  const { workspaceSlug, channelId } = useChannelMembersParams();
  const { authProvider, user } = useAuth();
  const { apiClient: api } = useServer();
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

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
     
  }, [workspaceSlug, channelId, authProvider]);

  const fetchWorkspaceMembers = useCallback(async () => {
    if (!workspaceSlug) return;
    const members = await listWorkspaceMembers(opDeps, workspaceSlug);
    setWorkspaceMembers(members);
     
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
            await removeChannelMember(apiDeps, workspaceSlug!, channelId!, memberId);
            setChannelMembersList((prev) => prev.filter((m) => m.id !== memberId));
          },
        },
      ]);
    },
     
    [workspaceSlug, channelId, authProvider],
  );

  const handleAdd = useCallback(
    async (memberId: string) => {
      await addChannelMember(apiDeps, workspaceSlug!, channelId!, memberId);
      await fetchMembers();
      setAddMode(false);
    },
     
    [workspaceSlug, channelId, authProvider, fetchMembers],
  );

  const memberIds = new Set(channelMembersList.map((m) => m.id));
  const nonMembers = workspaceMembers.filter((m) => !memberIds.has(m.id));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  const dataToShow: Array<{ id: string; displayName: string; email: string; avatarUrl: string | null }> = addMode ? nonMembers : channelMembersList;

  return (
    <View style={styles.container}>
      {canManage && (
        <View style={styles.addButtonRow}>
          <Pressable
            testID="member-add-button"
            onPress={() => setAddMode(!addMode)}
            accessibilityRole="button"
            accessibilityLabel={addMode ? "Done" : "Add Member"}
            accessibilityHint={addMode ? "Finishes adding members" : "Starts adding members"}
          >
            <Text style={styles.addButtonText}>
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
              style={styles.memberRow}
            >
              {/* Avatar initials */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.displayName || item.email)?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.displayName}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
              {addMode ? (
                <Pressable
                  onPress={() => handleAdd(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.displayName}`}
                  accessibilityHint="Adds this member to the channel"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 6,
                  })}
                >
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              ) : (
                canManage &&
                item.id !== channel?.createdBy && (
                  <Pressable
                    testID={`member-remove-${item.id}`}
                    onPress={() => handleRemove(item.id, item.displayName)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.displayName}`}
                    accessibilityHint="Removes this member from the channel"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? theme.brand.danger + "22" : theme.colors.surface,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: theme.brand.danger,
                    })}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                )
              )}
            </View>
          );

          if (addMode) return rowContent;

          return (
            <Pressable
              onPress={() => router.push(routes.profile(workspaceSlug!, item.id))}
              accessibilityRole="button"
              accessibilityLabel={`View profile of ${item.displayName}`}
              accessibilityHint="Opens the member profile"
            >
              {rowContent}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {addMode ? "All workspace members are already in this channel" : "No members"}
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
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    addButtonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    addButtonText: {
      color: theme.brand.primary,
      fontSize: 16,
      fontWeight: "500",
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceTertiary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    avatarText: {
      color: theme.colors.textSecondary,
      fontWeight: "600",
      fontSize: 14,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    memberEmail: {
      color: theme.colors.textFaint,
      fontSize: 12,
    },
    addText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 14,
    },
    removeText: {
      color: theme.brand.danger,
      fontWeight: "500",
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
