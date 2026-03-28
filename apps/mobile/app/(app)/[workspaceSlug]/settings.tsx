/**
 * Variant B: "Full-bleed Header"
 * Colored gradient-style header band with avatar overlapping the edge.
 * Content below in a white/dark sheet with rounded top corners.
 * Feels like a modern social profile page.
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { getCurrentUser, updateCurrentUser, type UserProfile } from "@openslaq/client-core";
import { ChevronRight, Bell, Palette, Settings2, LogOut, Smile } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { useApiDeps } from "@/hooks/useOperationDeps";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { SetStatusModal } from "@/components/SetStatusModal";
import { useServer } from "@/contexts/ServerContext";
import { routes } from "@/lib/routes";
import type { MobileTheme } from "@openslaq/shared";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

export default function SettingsScreen() {
  const { authProvider, user, signOut } = useAuth();
  const { apiClient: api } = useServer();
  const { theme } = useMobileTheme();
  const { workspaceSlug } = useWorkspaceParams();
  const { state, dispatch } = useChatStore();
  const router = useRouter();
  const apiDeps = useApiDeps();
  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdminOrOwner = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";
  const styles = makeStyles(theme);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const userId = user?.id;
  const presence = userId ? state.presence[userId] : undefined;
  const statusExpired = presence?.statusExpiresAt
    ? new Date(presence.statusExpiresAt).getTime() <= Date.now()
    : false;
  const hasStatus = Boolean(presence && !statusExpired && (presence.statusEmoji || presence.statusText));

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const deps = { api, auth: authProvider };

  const fetchProfile = useCallback(async () => {
    try {
      const user = await getCurrentUser(deps);
      setProfile(user);
      setDisplayName(user.displayName);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
     
  }, [authProvider]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const hasNameChanged = profile != null && displayName.trim() !== profile.displayName;

  const handleSaveName = useCallback(async () => {
    if (!hasNameChanged || !displayName.trim()) return;
    setSaving(true);
    try {
      const updated = await updateCurrentUser(deps, { displayName: displayName.trim() });
      setProfile(updated);
    } catch {
      Alert.alert("Error", "Failed to update display name");
    } finally {
      setSaving(false);
    }
     
  }, [authProvider, displayName, hasNameChanged]);

  const handleChangePhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    setSaving(true);
    try {
      const updated = await updateCurrentUser(deps, { avatarUrl: dataUrl });
      setProfile(updated);
    } catch {
      Alert.alert("Error", "Failed to update photo");
    } finally {
      setSaving(false);
    }
     
  }, [authProvider]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => void signOut() },
    ]);
  }, [signOut]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  const AVATAR_SIZE = 88;
  const HEADER_HEIGHT = 120;

  return (
    <>
    <ScrollView
      testID="settings-screen"
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Colored header band */}
      <View style={[styles.headerContainer, { height: HEADER_HEIGHT + AVATAR_SIZE / 2 }]}>
        <View style={[styles.headerBand, { height: HEADER_HEIGHT }]} />
        {/* Avatar floating on the border */}
        <View style={styles.avatarFloating}>
          <Pressable testID="change-photo-button" onPress={handleChangePhoto} disabled={saving} accessibilityRole="button" accessibilityLabel="Change photo" accessibilityHint="Opens photo picker to change profile photo">
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={[styles.avatarImage, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}
              />
            ) : (
              <View style={[styles.avatarFallback, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
                <Text style={styles.avatarInitials}>
                  {getInitials(profile?.displayName)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Name + email centered */}
      <View style={styles.nameSection}>
        <Text style={styles.displayNameText}>
          {profile?.displayName ?? ""}
        </Text>
        <Text testID="settings-email" style={styles.emailText}>
          {profile?.email ?? ""}
        </Text>
      </View>

      {/* Edit Profile section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          Profile
        </Text>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <View style={styles.nameInputRow}>
              <TextInput
                testID="settings-display-name-input"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.nameInput}
                placeholder="Display name"
                placeholderTextColor={theme.colors.textFaint}
                accessibilityLabel="Display name"
                accessibilityHint="Enter your display name"
              />
              {hasNameChanged && (
                <Pressable
                  testID="settings-save-name"
                  onPress={handleSaveName}
                  disabled={saving || !displayName.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Save name"
                  accessibilityHint="Saves your display name"
                  style={styles.saveButton}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? "..." : "Save"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Set Status row */}
      <View style={styles.section}>
        <Pressable
          testID="set-status-row"
          onPress={() => setStatusModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Set a status"
          accessibilityHint="Opens the set status modal"
          style={({ pressed }) => [
            styles.card,
            styles.statusRow,
            { backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surfaceSecondary },
          ]}
        >
          {hasStatus && presence ? (
            <>
              {presence.statusEmoji ? (
                <Text style={styles.statusEmoji}>{presence.statusEmoji}</Text>
              ) : (
                <Smile size={20} color={theme.colors.textSecondary} />
              )}
              <Text style={styles.statusLabel} numberOfLines={1}>
                {presence.statusText || presence.statusEmoji || ""}
              </Text>
            </>
          ) : (
            <>
              <Smile size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>
                Set a status
              </Text>
            </>
          )}
          <ChevronRight size={18} color={theme.colors.textFaint} />
        </Pressable>
      </View>

      {/* Settings nav section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          Settings
        </Text>
        <View style={styles.card}>
          {isAdminOrOwner && (
            <NavRow
              icon={<Settings2 size={20} color={theme.colors.textSecondary} />}
              label="Workspace Settings"
              onPress={() => router.push(routes.workspaceSettings(workspaceSlug!))}
              testID="workspace-settings-link"
              theme={theme}
            />
          )}
          <NavRow
            icon={<Bell size={20} color={theme.colors.textSecondary} />}
            label="Notifications"
            onPress={() => router.push(routes.notificationSettings(workspaceSlug!))}
            testID="notification-settings-link"
            theme={theme}
          />
          <NavRow
            icon={<Palette size={20} color={theme.colors.textSecondary} />}
            label="Preferences"
            onPress={() => router.push(routes.preferences(workspaceSlug!))}
            testID="preferences-link"
            theme={theme}
            isLast
          />
        </View>
      </View>

      {/* Sign Out */}
      <Pressable
        testID="settings-sign-out"
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
        accessibilityHint="Signs you out of the app"
        style={({ pressed }) => ({
          marginHorizontal: 20,
          marginTop: 32,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: pressed ? theme.colors.dangerBg : theme.colors.surfaceSecondary,
        })}
      >
        <LogOut size={18} color={theme.colors.dangerText} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

    </ScrollView>

      {userId && (
        <SetStatusModal
          visible={statusModalVisible}
          onClose={() => setStatusModalVisible(false)}
          currentEmoji={hasStatus && presence ? (presence.statusEmoji ?? null) : null}
          currentText={hasStatus && presence ? (presence.statusText ?? null) : null}
          userId={userId as any}
          deps={apiDeps}
          dispatch={dispatch}
        />
      )}
    </>
  );
}

function NavRow({
  icon,
  label,
  onPress,
  testID,
  theme,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  testID: string;
  theme: MobileTheme;
  isLast?: boolean;
}) {
  const styles = navRowStyles(theme, isLast);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`Opens ${label} settings`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surfaceSecondary },
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.textFaint} />
    </Pressable>
  );
}

const navRowStyles = (theme: MobileTheme, isLast: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    iconWrap: {
      marginRight: 14,
    },
    label: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
  });

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    scrollContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    scrollContent: {
      paddingBottom: 48,
    },
    headerContainer: {
      position: "relative",
    },
    headerBand: {
      backgroundColor: theme.brand.primary,
    },
    avatarFloating: {
      position: "absolute",
      bottom: 0,
      alignSelf: "center",
    },
    avatarImage: {
      borderWidth: 4,
      borderColor: theme.colors.surface,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    avatarFallback: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderWidth: 4,
      borderColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: {
      color: theme.brand.primary,
      fontSize: 32,
      fontWeight: "700",
    },
    nameSection: {
      alignItems: "center",
      marginTop: 12,
      paddingHorizontal: 24,
    },
    displayNameText: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "700",
    },
    emailText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 4,
    },
    section: {
      marginHorizontal: 20,
      marginTop: 24,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 14,
      overflow: "hidden",
    },
    cardInner: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    fieldLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 4,
    },
    nameInputRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    nameInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 16,
      paddingVertical: 4,
    },
    saveButton: {
      backgroundColor: theme.brand.primary,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginLeft: 8,
    },
    saveButtonText: {
      color: theme.colors.headerText,
      fontSize: 14,
      fontWeight: "600",
    },
    signOutText: {
      color: theme.colors.dangerText,
      fontSize: 16,
      fontWeight: "600",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    statusEmoji: {
      fontSize: 20,
    },
    statusLabel: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
  });
