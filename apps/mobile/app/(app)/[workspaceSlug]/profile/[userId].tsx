import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { listWorkspaceMembers, createDm, type WorkspaceMember, type PresenceEntry } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { SetStatusModal } from "@/components/SetStatusModal";
import { useOperationDeps, useApiDeps } from "@/hooks/useOperationDeps";
import { useProfileParams } from "@/hooks/useRouteParams";
import { routes } from "@/lib/routes";
import type { MobileTheme, UserId } from "@openslaq/shared";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

function roleBadgeColor(role: string, theme: MobileTheme): string {
  switch (role) {
    case "owner":
      return theme.colors.ownerBadge;
    case "admin":
      return theme.brand.primary;
    default:
      return theme.colors.textMuted;
  }
}

function formatPresence(presence: PresenceEntry | undefined): { label: string; online: boolean } {
  if (!presence) return { label: "Offline", online: false };
  if (presence.online) return { label: "Online", online: true };
  if (presence.lastSeenAt) {
    const date = new Date(presence.lastSeenAt);
    return {
      label: `Last seen ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      online: false,
    };
  }
  return { label: "Offline", online: false };
}

export default function ProfileScreen() {
  const { workspaceSlug, userId } = useProfileParams();
  const { user: currentUser } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const apiDeps = useApiDeps();
  const { joinHuddle } = useHuddle();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);

  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const isOwnProfile = currentUser?.id === userId;
  const presence = userId ? state.presence[userId] : undefined;
  const presenceInfo = formatPresence(presence);

  const statusExpired = presence?.statusExpiresAt
    ? new Date(presence.statusExpiresAt).getTime() <= Date.now()
    : false;
  const hasStatus = Boolean(presence && !statusExpired && (presence.statusEmoji || presence.statusText));

  useEffect(() => {
    if (!workspaceSlug || !userId) return;
    let cancelled = false;
    void listWorkspaceMembers(apiDeps, workspaceSlug).then((members) => {
      if (cancelled) return;
      const found = members.find((m) => m.id === userId);
      setMember(found ?? null);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [workspaceSlug, userId, apiDeps]);

  const handleSendMessage = useCallback(async () => {
    if (!workspaceSlug || !userId) return;
    try {
      const result = await createDm(deps, { workspaceSlug, targetUserId: userId });
      if (!result) throw new Error("DM not created");
      router.push(routes.dm(workspaceSlug, result.channel.id));
    } catch {
      Alert.alert("Error", "Failed to create direct message");
    }
  }, [workspaceSlug, userId, deps, router]);

  const handleHuddle = useCallback(async () => {
    if (!workspaceSlug || !userId) return;
    try {
      const result = await createDm(deps, { workspaceSlug, targetUserId: userId });
      if (!result) throw new Error("DM not created");
      joinHuddle(result.channel.id);
      router.push(routes.huddle(workspaceSlug));
    } catch {
      Alert.alert("Error", "Failed to start huddle");
    }
  }, [workspaceSlug, userId, deps, router, joinHuddle]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>User not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        testID="profile-screen"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {getInitials(member.displayName)}
            </Text>
          </View>
        )}

        <Text testID="profile-display-name" style={styles.displayName}>
          {member.displayName}
        </Text>

        <Text testID="profile-email" style={styles.email}>
          {member.email}
        </Text>

        {/* Status display */}
        {hasStatus && presence && (
          <View testID="profile-status" style={styles.statusRow}>
            {presence.statusEmoji && <Text style={styles.statusEmoji}>{presence.statusEmoji}</Text>}
            {presence.statusText && (
              <Text style={styles.statusText}>{presence.statusText}</Text>
            )}
          </View>
        )}

        {/* Role badge + presence */}
        <View style={styles.roleBadgeRow}>
          <View style={styles.roleBadge}>
            <Text style={[styles.roleText, { color: roleBadgeColor(member.role, theme) }]}>
              {member.role}
            </Text>
          </View>

          <View testID="profile-presence" style={styles.presenceRow}>
            <View
              style={[
                styles.presenceDot,
                { backgroundColor: presenceInfo.online ? theme.colors.presenceOnline : theme.colors.presenceOffline },
              ]}
            />
            <Text style={styles.presenceLabel}>
              {presenceInfo.label}
            </Text>
          </View>
        </View>

        {/* Member since */}
        {member.joinedAt && (
          <Text testID="profile-member-since" style={styles.memberSince}>
            Member since {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
        )}

        {/* Own profile actions */}
        {isOwnProfile && (
          <View style={styles.ownActions}>
            <Pressable
              testID="profile-edit-status"
              onPress={() => setStatusModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={hasStatus ? "Edit Status" : "Set a status"}
              accessibilityHint="Opens the status editor"
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={styles.ownActionText}>
                {hasStatus ? "Edit Status" : "Set a status"}
              </Text>
            </Pressable>
            <Pressable
              testID="profile-edit-profile"
              onPress={() => router.push(routes.settings(workspaceSlug!))}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
              accessibilityHint="Opens profile settings"
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={styles.ownActionText}>
                Edit Profile
              </Text>
            </Pressable>
          </View>
        )}

        {/* Other user actions: Message + Huddle */}
        {!isOwnProfile && (
          <View style={styles.otherActions}>
            <Pressable
              testID="profile-send-message"
              onPress={handleSendMessage}
              accessibilityRole="button"
              accessibilityLabel="Message"
              accessibilityHint="Sends a direct message to this user"
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? theme.brand.primary + "dd" : theme.brand.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
              })}
            >
              <Text style={styles.primaryButtonText}>Message</Text>
            </Pressable>
            <Pressable
              testID="profile-huddle"
              onPress={handleHuddle}
              accessibilityRole="button"
              accessibilityLabel="Huddle"
              accessibilityHint="Starts a huddle with this user"
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.brand.primary,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={styles.huddleButtonText}>Huddle</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {isOwnProfile && userId && (
        <SetStatusModal
          visible={statusModalVisible}
          onClose={() => setStatusModalVisible(false)}
          currentEmoji={hasStatus && presence ? (presence.statusEmoji ?? null) : null}
          currentText={hasStatus && presence ? (presence.statusText ?? null) : null}
          userId={userId!}
          deps={apiDeps}
          dispatch={dispatch}
        />
      )}
    </>
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
    emptyText: {
      color: theme.colors.textFaint,
    },
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    scrollContent: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.surfaceTertiary,
      marginBottom: 16,
    },
    avatarFallback: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.brand.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    avatarFallbackText: {
      color: theme.colors.headerText,
      fontSize: 36,
      fontWeight: "700",
    },
    displayName: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 4,
    },
    email: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 4,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 8,
    },
    statusEmoji: {
      fontSize: 14,
    },
    statusText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    roleBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      marginTop: 4,
    },
    roleBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceTertiary,
      marginRight: 8,
    },
    roleText: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    presenceRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    presenceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 4,
    },
    presenceLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    memberSince: {
      color: theme.colors.textFaint,
      fontSize: 12,
      marginBottom: 16,
    },
    ownActions: {
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    ownActionText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "500",
    },
    otherActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    primaryButtonText: {
      color: theme.colors.headerText,
      fontSize: 16,
      fontWeight: "600",
    },
    huddleButtonText: {
      color: theme.brand.primary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
