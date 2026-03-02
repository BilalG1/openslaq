import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { WorkspaceInvite } from "@openslaq/shared";
import {
  listWorkspaceMembers,
  updateMemberRole,
  removeMember,
  deleteWorkspace,
  listInvites,
  createInvite,
  revokeInvite,
  listWorkspaces,
  type WorkspaceMember,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { MemberRow } from "@/components/workspace/MemberRow";

export default function WorkspaceSettingsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider, user } = useAuth();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const deps = { api, auth: authProvider };

  const currentUserRole = members.find((m) => m.id === user?.id)?.role;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const canManage = isOwner || isAdmin;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberData, workspaceData] = await Promise.all([
        listWorkspaceMembers(deps, workspaceSlug),
        listWorkspaces(deps),
      ]);
      setMembers(memberData);
      const ws = workspaceData.find((w) => w.slug === workspaceSlug);
      if (ws) setWorkspaceName(ws.name);

      try {
        const inviteData = await listInvites(deps, workspaceSlug);
        setInvites(inviteData);
      } catch {
        // Non-admin can't list invites
      }
    } catch {
      setError("Failed to load workspace settings");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProvider, workspaceSlug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canChangeRole = (member: WorkspaceMember) => {
    if (!canManage) return false;
    if (member.id === user?.id) return false;
    if (member.role === "owner") return false;
    if (isAdmin && member.role === "admin") return false;
    return true;
  };

  const canRemoveMember = (member: WorkspaceMember) => {
    if (!canManage) return false;
    if (member.id === user?.id) return false;
    if (member.role === "owner") return false;
    if (isAdmin && member.role === "admin") return false;
    return true;
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await updateMemberRole(deps, workspaceSlug, userId, newRole);
      const updated = await listWorkspaceMembers(deps, workspaceSlug);
      setMembers(updated);
    } catch {
      Alert.alert("Error", "Failed to update role");
    }
  };

  const handleRemoveMember = (userId: string, displayName: string) => {
    Alert.alert("Remove Member", `Remove ${displayName} from the workspace?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMember(deps, workspaceSlug, userId);
            const updated = await listWorkspaceMembers(deps, workspaceSlug);
            setMembers(updated);
          } catch {
            Alert.alert("Error", "Failed to remove member");
          }
        },
      },
    ]);
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      await createInvite(deps, workspaceSlug);
      const updated = await listInvites(deps, workspaceSlug);
      setInvites(updated);
    } catch {
      Alert.alert("Error", "Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleShareInvite = async (code: string) => {
    const url = `${process.env.EXPO_PUBLIC_WEB_URL ?? "https://openslaq.com"}/invite/${code}`;
    await Share.share({ message: `Join my workspace on OpenSlaq: ${url}` });
  };

  const handleRevokeInvite = (inviteId: string) => {
    Alert.alert("Revoke Invite", "This invite link will stop working.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeInvite(deps, workspaceSlug, inviteId);
            const updated = await listInvites(deps, workspaceSlug);
            setInvites(updated);
          } catch {
            Alert.alert("Error", "Failed to revoke invite");
          }
        },
      },
    ]);
  };

  const handleDeleteWorkspace = () => {
    Alert.alert(
      "Delete Workspace",
      "This action cannot be undone. All data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingWorkspace(true);
            try {
              await deleteWorkspace(deps, workspaceSlug);
              router.replace("/(app)/");
            } catch {
              Alert.alert("Error", "Failed to delete workspace");
              setDeletingWorkspace(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="workspace-settings-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      contentContainerStyle={{ paddingVertical: 16 }}
    >
      {error && (
        <Text style={{ color: theme.colors.dangerText, paddingHorizontal: 16, marginBottom: 12 }}>
          {error}
        </Text>
      )}

      {/* Members Section */}
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: theme.colors.textSecondary,
            paddingHorizontal: 16,
            marginBottom: 8,
          }}
        >
          Members ({members.length})
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.surfaceSecondary,
            marginHorizontal: 16,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {members.map((member) => (
            <MemberRow
              key={member.id}
              id={member.id}
              displayName={member.displayName}
              email={member.email}
              avatarUrl={member.avatarUrl}
              role={member.role}
              isCurrentUser={member.id === user?.id}
              canChangeRole={canChangeRole(member)}
              canRemove={canRemoveMember(member)}
              onChangeRole={handleChangeRole}
              onRemove={handleRemoveMember}
            />
          ))}
        </View>
      </View>

      {/* Invites Section (admin/owner only) */}
      {canManage && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary }}>
              Invites ({invites.length})
            </Text>
            <Pressable
              testID="create-invite-button"
              onPress={handleCreateInvite}
              disabled={creatingInvite}
              style={{
                backgroundColor: theme.brand.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                {creatingInvite ? "Creating..." : "New Invite"}
              </Text>
            </Pressable>
          </View>

          {invites.length > 0 && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                marginHorizontal: 16,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {invites.map((invite) => (
                <View
                  key={invite.id}
                  testID={`invite-row-${invite.id}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.borderDefault,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontFamily: "monospace" }}>
                      {invite.code}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      Uses: {invite.useCount}{invite.maxUses ? `/${invite.maxUses}` : ""}
                      {invite.expiresAt ? ` · Expires ${new Date(invite.expiresAt).toLocaleDateString()}` : ""}
                    </Text>
                  </View>

                  <Pressable
                    testID={`share-invite-${invite.id}`}
                    onPress={() => void handleShareInvite(invite.code)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: theme.brand.primary,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ color: theme.brand.primary, fontSize: 12 }}>Share</Text>
                  </Pressable>

                  <Pressable
                    testID={`revoke-invite-${invite.id}`}
                    onPress={() => handleRevokeInvite(invite.id)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: "#ef4444",
                    }}
                  >
                    <Text style={{ color: "#ef4444", fontSize: 12 }}>Revoke</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Delete Workspace (owner only) */}
      {isOwner && (
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ef4444",
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#ef4444", marginBottom: 4 }}>
            Delete Workspace
          </Text>
          <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 }}>
            This action is irreversible. Type{" "}
            <Text style={{ fontWeight: "700" }}>{workspaceName}</Text> to confirm.
          </Text>
          <TextInput
            testID="delete-workspace-input"
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            placeholder={workspaceName}
            placeholderTextColor={theme.colors.textFaint}
            style={{
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              marginBottom: 10,
            }}
          />
          <Pressable
            testID="delete-workspace-button"
            onPress={handleDeleteWorkspace}
            disabled={deleteConfirm !== workspaceName || deletingWorkspace}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              backgroundColor:
                deleteConfirm !== workspaceName || deletingWorkspace
                  ? theme.colors.surfaceTertiary
                  : "#ef4444",
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
            })}
          >
            {deletingWorkspace ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                Delete Workspace
              </Text>
            )}
          </Pressable>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
