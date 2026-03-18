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
import { Copy, Check, Share2, Plus, Trash2, Users, Link2, AlertTriangle } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { MemberRow } from "@/components/workspace/MemberRow";
import * as Clipboard from "expo-clipboard";

type Tab = "members" | "invites" | "danger";

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
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

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
      } catch {}
    } catch {
      setError("Failed to load workspace settings");
    } finally {
      setLoading(false);
    }
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

  const getInviteUrl = (code: string) =>
    `${process.env.EXPO_PUBLIC_WEB_URL ?? "https://openslaq.com"}/invite/${code}`;

  const handleCopyInvite = async (invite: WorkspaceInvite) => {
    await Clipboard.setStringAsync(getInviteUrl(invite.code));
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const handleShareInvite = async (code: string) => {
    const url = getInviteUrl(code);
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "members", label: "Members", icon: <Users size={14} color={activeTab === "members" ? "#fff" : theme.colors.textSecondary} /> },
    { key: "invites", label: "Invites", icon: <Link2 size={14} color={activeTab === "invites" ? "#fff" : theme.colors.textSecondary} /> },
    ...(isOwner ? [{ key: "danger" as Tab, label: "Danger", icon: <AlertTriangle size={14} color={activeTab === "danger" ? "#fff" : "#ef4444"} /> }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Segmented Control */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              testID={`tab-${tab.key}`}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: activeTab === tab.key
                  ? (tab.key === "danger" ? "#ef4444" : theme.brand.primary)
                  : "transparent",
              }}
            >
              {tab.icon}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: activeTab === tab.key ? "#fff" : theme.colors.textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && (
        <Text style={{ color: theme.colors.dangerText, paddingHorizontal: 16, marginBottom: 8 }}>
          {error}
        </Text>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Members Tab */}
        {activeTab === "members" && (
          <View style={{ paddingTop: 8 }}>
            <Text style={{ fontSize: 13, color: theme.colors.textMuted, paddingHorizontal: 16, marginBottom: 8 }}>
              {members.length} member{members.length !== 1 ? "s" : ""}
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                marginHorizontal: 16,
                borderRadius: 12,
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
        )}

        {/* Invites Tab */}
        {activeTab === "invites" && canManage && (
          <View style={{ paddingTop: 8 }}>
            {/* Hero invite card */}
            {invites.length > 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
                {invites.map((invite) => (
                  <View
                    key={invite.id}
                    testID={`invite-row-${invite.id}`}
                    style={{
                      backgroundColor: theme.colors.surfaceSecondary,
                      borderRadius: 16,
                      padding: 20,
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: `${theme.brand.primary}15`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Link2 size={20} color={theme.brand.primary} />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary }}>
                          Invite Link
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                          Uses: {invite.useCount}{invite.maxUses ? `/${invite.maxUses}` : ""}
                          {invite.expiresAt ? ` · Expires ${new Date(invite.expiresAt).toLocaleDateString()}` : ""}
                        </Text>
                      </View>
                    </View>

                    {/* URL display */}
                    <View
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor: theme.colors.borderDefault,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.textPrimary, fontSize: 13, fontFamily: "monospace" }}
                        numberOfLines={2}
                        selectable
                      >
                        {getInviteUrl(invite.code)}
                      </Text>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => void handleCopyInvite(invite)}
                        style={({ pressed }) => ({
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: copiedInviteId === invite.id ? "#059669" : theme.brand.primary,
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        {copiedInviteId === invite.id ? (
                          <Check size={18} color="#fff" />
                        ) : (
                          <Copy size={18} color="#fff" />
                        )}
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                          {copiedInviteId === invite.id ? "Copied!" : "Copy Link"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => void handleShareInvite(invite.code)}
                        style={({ pressed }) => ({
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          paddingVertical: 12,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: theme.brand.primary,
                          backgroundColor: pressed ? `${theme.brand.primary}10` : "transparent",
                        })}
                      >
                        <Share2 size={18} color={theme.brand.primary} />
                        <Text style={{ color: theme.brand.primary, fontSize: 15, fontWeight: "600" }}>
                          Share
                        </Text>
                      </Pressable>
                    </View>

                    {/* Revoke link */}
                    <Pressable
                      onPress={() => handleRevokeInvite(invite.id)}
                      style={{ alignSelf: "center", marginTop: 14 }}
                    >
                      <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Revoke this link</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Create new invite */}
            <View style={{ paddingHorizontal: 16 }}>
              <Pressable
                testID="create-invite-button"
                onPress={handleCreateInvite}
                disabled={creatingInvite}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: theme.colors.borderDefault,
                  borderStyle: "dashed",
                  backgroundColor: pressed ? theme.colors.surfaceSecondary : "transparent",
                })}
              >
                {creatingInvite ? (
                  <ActivityIndicator size="small" color={theme.brand.primary} />
                ) : (
                  <Plus size={18} color={theme.brand.primary} />
                )}
                <Text style={{ color: theme.brand.primary, fontSize: 15, fontWeight: "500" }}>
                  {creatingInvite ? "Creating..." : "Create New Invite"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Danger Tab */}
        {activeTab === "danger" && isOwner && (
          <View style={{ padding: 16 }}>
            <View
              style={{
                backgroundColor: theme.colors.dangerBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.dangerBorder,
                padding: 20,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Trash2 size={20} color={theme.brand.danger} />
                <Text style={{ fontSize: 17, fontWeight: "700", color: theme.brand.danger }}>
                  Delete Workspace
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: theme.colors.dangerText, lineHeight: 20, marginBottom: 16 }}>
                This action is irreversible. All channels, messages, and files will be permanently deleted.
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.dangerText, marginBottom: 8 }}>
                Type <Text style={{ fontWeight: "700" }}>{workspaceName}</Text> to confirm:
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
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: theme.colors.dangerBorder,
                  marginBottom: 14,
                }}
              />
              <Pressable
                testID="delete-workspace-button"
                onPress={handleDeleteWorkspace}
                disabled={deleteConfirm !== workspaceName || deletingWorkspace}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor:
                    deleteConfirm !== workspaceName || deletingWorkspace ? theme.colors.dangerBorder : theme.brand.danger,
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                })}
              >
                {deletingWorkspace ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    Delete Workspace Forever
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
