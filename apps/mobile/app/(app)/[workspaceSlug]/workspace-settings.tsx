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
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import type { WorkspaceInvite, MobileTheme, UserId } from "@openslaq/shared";
import { asUserId } from "@openslaq/shared";
import {
  listWorkspaceMembers,
  updateMemberRole,
  removeMember,
  leaveWorkspace,
  deleteWorkspace,
  listInvites,
  createInvite,
  revokeInvite,
  listWorkspaces,
  type WorkspaceMember,
} from "@openslaq/client-core";
import { Copy, Check, Share2, Plus, Trash2, Users, Link2, AlertTriangle, LogOut } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useServer } from "@/contexts/ServerContext";
import { MemberRow } from "@/components/workspace/MemberRow";
import * as Clipboard from "expo-clipboard";

type Tab = "members" | "invites" | "danger";

export default function WorkspaceSettingsScreen() {
  const { workspaceSlug } = useWorkspaceParams();
  const { authProvider, user } = useAuth();
  const { apiClient: api } = useServer();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [leavingWorkspace, setLeavingWorkspace] = useState(false);
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
        listWorkspaceMembers(deps, workspaceSlug!),
        listWorkspaces(deps),
      ]);
      setMembers(memberData);
      const ws = workspaceData.find((w) => w.slug === workspaceSlug);
      if (ws) setWorkspaceName(ws.name);
      try {
        const inviteData = await listInvites(deps, workspaceSlug!);
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

  const handleChangeRole = async (userId: UserId, newRole: string) => {
    try {
      await updateMemberRole(deps, workspaceSlug!, userId, newRole);
      const updated = await listWorkspaceMembers(deps, workspaceSlug!);
      setMembers(updated);
    } catch {
      Alert.alert("Error", "Failed to update role");
    }
  };

  const handleRemoveMember = (userId: UserId, displayName: string) => {
    Alert.alert("Remove Member", `Remove ${displayName} from the workspace?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMember(deps, workspaceSlug!, userId);
            const updated = await listWorkspaceMembers(deps, workspaceSlug!);
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
      await createInvite(deps, workspaceSlug!);
      const updated = await listInvites(deps, workspaceSlug!);
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
            await revokeInvite(deps, workspaceSlug!, inviteId);
            const updated = await listInvites(deps, workspaceSlug!);
            setInvites(updated);
          } catch {
            Alert.alert("Error", "Failed to revoke invite");
          }
        },
      },
    ]);
  };

  const handleLeaveWorkspace = () => {
    Alert.alert(
      "Leave Workspace",
      "You will lose access to all channels and messages. You will need a new invite to rejoin.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            setLeavingWorkspace(true);
            try {
              await leaveWorkspace(deps, workspaceSlug!);
              router.replace("/(app)/");
            } catch {
              Alert.alert("Error", "Failed to leave workspace");
              setLeavingWorkspace(false);
            }
          },
        },
      ],
    );
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
              await deleteWorkspace(deps, workspaceSlug!);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "members", label: "Members", icon: <Users size={14} color={activeTab === "members" ? theme.colors.headerText : theme.colors.textSecondary} /> },
    { key: "invites", label: "Invites", icon: <Link2 size={14} color={activeTab === "invites" ? theme.colors.headerText : theme.colors.textSecondary} /> },
    { key: "danger" as Tab, label: "Danger", icon: <AlertTriangle size={14} color={activeTab === "danger" ? theme.colors.headerText : theme.brand.danger} /> },
  ];

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentedControlOuter}>
        <View style={styles.segmentedControl}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              testID={`tab-${tab.key}`}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityHint={`Switches to ${tab.label} tab`}
              style={[
                styles.tabButton,
                {
                  backgroundColor: activeTab === tab.key
                    ? (tab.key === "danger" ? theme.brand.danger : theme.brand.primary)
                    : theme.colors.surfaceSecondary,
                },
              ]}
            >
              {tab.icon}
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? theme.colors.headerText : theme.colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Members Tab */}
        {activeTab === "members" && (
          <View style={styles.tabContent}>
            <Text style={styles.memberCount}>
              {members.length} member{members.length !== 1 ? "s" : ""}
            </Text>
            <View style={styles.membersCard}>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  id={asUserId(member.id)}
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
          <View style={styles.tabContent}>
            {invites.length > 0 && (
              <View style={styles.inviteCards}>
                {invites.map((invite) => (
                  <View key={invite.id} testID={`invite-row-${invite.id}`} style={styles.inviteCard}>
                    <View style={styles.inviteHeader}>
                      <View style={styles.inviteIconCircle}>
                        <Link2 size={20} color={theme.brand.primary} />
                      </View>
                      <View style={styles.inviteHeaderText}>
                        <Text style={styles.inviteLinkLabel}>Invite Link</Text>
                        <Text style={styles.inviteUses}>
                          Uses: {invite.useCount}{invite.maxUses ? `/${invite.maxUses}` : ""}
                          {invite.expiresAt ? ` · Expires ${new Date(invite.expiresAt).toLocaleDateString()}` : ""}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inviteUrlBox}>
                      <Text style={styles.inviteUrlText} numberOfLines={2} selectable>
                        {getInviteUrl(invite.code)}
                      </Text>
                    </View>

                    <View style={styles.inviteActions}>
                      <Pressable
                        onPress={() => void handleCopyInvite(invite)}
                        accessibilityRole="button"
                        accessibilityLabel={copiedInviteId === invite.id ? "Copied" : "Copy Link"}
                        accessibilityHint="Copies the invite link to clipboard"
                        style={({ pressed }) => ({
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: copiedInviteId === invite.id ? theme.colors.copiedBg : theme.brand.primary,
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        {copiedInviteId === invite.id ? (
                          <Check size={18} color={theme.colors.headerText} />
                        ) : (
                          <Copy size={18} color={theme.colors.headerText} />
                        )}
                        <Text style={styles.inviteActionPrimaryText}>
                          {copiedInviteId === invite.id ? "Copied!" : "Copy Link"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => void handleShareInvite(invite.code)}
                        accessibilityRole="button"
                        accessibilityLabel="Share"
                        accessibilityHint="Shares the invite link"
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
                          backgroundColor: pressed ? `${theme.brand.primary}10` : theme.colors.surface,
                        })}
                      >
                        <Share2 size={18} color={theme.brand.primary} />
                        <Text style={styles.inviteShareText}>Share</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => handleRevokeInvite(invite.id)}
                      style={styles.revokeLink}
                      accessibilityRole="button"
                      accessibilityLabel="Revoke this link"
                      accessibilityHint="Revokes the invite link"
                    >
                      <Text style={styles.revokeText}>Revoke this link</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.createInviteWrap}>
              <Pressable
                testID="create-invite-button"
                onPress={handleCreateInvite}
                disabled={creatingInvite}
                accessibilityRole="button"
                accessibilityLabel="Create New Invite"
                accessibilityHint="Creates a new invite link"
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
                  backgroundColor: pressed ? theme.colors.surfaceSecondary : theme.colors.surface,
                })}
              >
                {creatingInvite ? (
                  <ActivityIndicator size="small" color={theme.brand.primary} />
                ) : (
                  <Plus size={18} color={theme.brand.primary} />
                )}
                <Text style={styles.createInviteText}>
                  {creatingInvite ? "Creating..." : "Create New Invite"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Danger Tab */}
        {activeTab === "danger" && !isOwner && (
          <View style={styles.dangerPadding}>
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <LogOut size={20} color={theme.brand.danger} />
                <Text style={styles.dangerTitle}>Leave Workspace</Text>
              </View>
              <Text style={styles.dangerDescription}>
                You will lose access to all channels and messages in this workspace. You will need a new invite to rejoin.
              </Text>
              <Pressable
                testID="leave-workspace-button"
                onPress={handleLeaveWorkspace}
                disabled={leavingWorkspace}
                accessibilityRole="button"
                accessibilityLabel="Leave Workspace"
                accessibilityHint="Leaves this workspace"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: leavingWorkspace ? theme.colors.dangerBorder : theme.brand.danger,
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                })}
              >
                {leavingWorkspace ? (
                  <ActivityIndicator size="small" color={theme.colors.headerText} />
                ) : (
                  <Text style={styles.dangerButtonText}>Leave Workspace</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
        {activeTab === "danger" && isOwner && (
          <View style={styles.dangerPadding}>
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <Trash2 size={20} color={theme.brand.danger} />
                <Text style={styles.dangerTitle}>Delete Workspace</Text>
              </View>
              <Text style={styles.dangerDescription}>
                This action is irreversible. All channels, messages, and files will be permanently deleted.
              </Text>
              <Text style={styles.dangerConfirmLabel}>
                Type <Text style={styles.dangerConfirmBold}>{workspaceName}</Text> to confirm:
              </Text>
              <TextInput
                testID="delete-workspace-input"
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                placeholder={workspaceName}
                placeholderTextColor={theme.colors.textFaint}
                style={styles.dangerInput}
                accessibilityLabel="Confirm workspace name"
                accessibilityHint="Type the workspace name to confirm deletion"
              />
              <Pressable
                testID="delete-workspace-button"
                onPress={handleDeleteWorkspace}
                disabled={deleteConfirm !== workspaceName || deletingWorkspace}
                accessibilityRole="button"
                accessibilityLabel="Delete Workspace Forever"
                accessibilityHint="Permanently deletes this workspace"
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
                  <ActivityIndicator size="small" color={theme.colors.headerText} />
                ) : (
                  <Text style={styles.dangerButtonText}>Delete Workspace Forever</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
    container: { flex: 1, backgroundColor: theme.colors.surface },
    segmentedControlOuter: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    segmentedControl: { flexDirection: "row", backgroundColor: theme.colors.surfaceSecondary, borderRadius: 10, padding: 3 },
    tabButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
    tabLabel: { fontSize: 13, fontWeight: "600" },
    errorText: { color: theme.colors.dangerText, paddingHorizontal: 16, marginBottom: 8 },
    scrollContent: { paddingBottom: 40 },
    tabContent: { paddingTop: 8 },
    memberCount: { fontSize: 13, color: theme.colors.textMuted, paddingHorizontal: 16, marginBottom: 8 },
    membersCard: { backgroundColor: theme.colors.surfaceSecondary, marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
    inviteCards: { marginHorizontal: 16, marginBottom: 16 },
    inviteCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 16, padding: 20, marginBottom: 12 },
    inviteHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    inviteIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.brand.primary}15`, alignItems: "center", justifyContent: "center" },
    inviteHeaderText: { marginLeft: 12, flex: 1 },
    inviteLinkLabel: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary },
    inviteUses: { fontSize: 12, color: theme.colors.textMuted },
    inviteUrlBox: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.borderDefault },
    inviteUrlText: { color: theme.colors.textPrimary, fontSize: 13, fontFamily: "monospace" },
    inviteActions: { flexDirection: "row", gap: 10 },
    inviteActionPrimaryText: { color: theme.colors.headerText, fontSize: 15, fontWeight: "600" },
    inviteShareText: { color: theme.brand.primary, fontSize: 15, fontWeight: "600" },
    revokeLink: { alignSelf: "center", marginTop: 14 },
    revokeText: { color: theme.colors.textMuted, fontSize: 13 },
    createInviteWrap: { paddingHorizontal: 16 },
    createInviteText: { color: theme.brand.primary, fontSize: 15, fontWeight: "500" },
    dangerPadding: { padding: 16 },
    dangerCard: { backgroundColor: theme.colors.dangerBg, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.dangerBorder, padding: 20 },
    dangerHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    dangerTitle: { fontSize: 17, fontWeight: "700", color: theme.brand.danger },
    dangerDescription: { fontSize: 14, color: theme.colors.dangerText, lineHeight: 20, marginBottom: 16 },
    dangerConfirmLabel: { fontSize: 13, color: theme.colors.dangerText, marginBottom: 8 },
    dangerConfirmBold: { fontWeight: "700" },
    dangerInput: { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: theme.colors.dangerBorder, marginBottom: 14 },
    dangerButtonText: { color: theme.colors.headerText, fontWeight: "700", fontSize: 15 },
  });
