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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getCurrentUser, updateCurrentUser, type UserProfile } from "@openslaq/client-core";
import { ChevronRight, Bell, Palette, Settings2, LogOut } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

export default function SettingsScreen() {
  const { authProvider, signOut } = useAuth();
  const { theme } = useMobileTheme();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const router = useRouter();
  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdminOrOwner = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProvider]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => void signOut() },
    ]);
  }, [signOut]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  const AVATAR_SIZE = 88;
  const HEADER_HEIGHT = 120;

  return (
    <ScrollView
      testID="settings-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Colored header band */}
      <View style={{ height: HEADER_HEIGHT + AVATAR_SIZE / 2, position: "relative" }}>
        <View
          style={{
            height: HEADER_HEIGHT,
            backgroundColor: theme.brand.primary,
          }}
        />
        {/* Avatar floating on the border */}
        <View style={{ position: "absolute", bottom: 0, alignSelf: "center" }}>
          <Pressable testID="change-photo-button" onPress={handleChangePhoto} disabled={saving}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  borderWidth: 4,
                  borderColor: theme.colors.surface,
                  backgroundColor: theme.colors.surfaceTertiary,
                }}
              />
            ) : (
              <View
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  backgroundColor: theme.colors.surfaceTertiary,
                  borderWidth: 4,
                  borderColor: theme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.brand.primary, fontSize: 32, fontWeight: "700" }}>
                  {getInitials(profile?.displayName)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Name + email centered */}
      <View style={{ alignItems: "center", marginTop: 12, paddingHorizontal: 24 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "700" }}>
          {profile?.displayName ?? ""}
        </Text>
        <Text
          testID="settings-email"
          style={{ color: theme.colors.textMuted, fontSize: 14, marginTop: 4 }}
        >
          {profile?.email ?? ""}
        </Text>
      </View>

      {/* Edit Profile section */}
      <View style={{ marginHorizontal: 20, marginTop: 28 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 }}>
          Profile
        </Text>
        <View style={{ backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, overflow: "hidden" }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 4 }}>Display Name</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                testID="settings-display-name-input"
                value={displayName}
                onChangeText={setDisplayName}
                style={{
                  flex: 1,
                  color: theme.colors.textPrimary,
                  fontSize: 16,
                  paddingVertical: 4,
                }}
                placeholder="Display name"
                placeholderTextColor={theme.colors.textFaint}
              />
              {hasNameChanged && (
                <Pressable
                  testID="settings-save-name"
                  onPress={handleSaveName}
                  disabled={saving || !displayName.trim()}
                  style={{
                    backgroundColor: theme.brand.primary,
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                    {saving ? "..." : "Save"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Settings nav section */}
      <View style={{ marginHorizontal: 20, marginTop: 24 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 }}>
          Settings
        </Text>
        <View style={{ backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, overflow: "hidden" }}>
          {isAdminOrOwner && (
            <NavRow
              icon={<Settings2 size={20} color={theme.colors.textSecondary} />}
              label="Workspace Settings"
              onPress={() => router.push(`/(app)/${workspaceSlug}/workspace-settings`)}
              testID="workspace-settings-link"
              theme={theme}
            />
          )}
          <NavRow
            icon={<Bell size={20} color={theme.colors.textSecondary} />}
            label="Notifications"
            onPress={() => router.push(`/(app)/${workspaceSlug}/notification-settings`)}
            testID="notification-settings-link"
            theme={theme}
          />
          <NavRow
            icon={<Palette size={20} color={theme.colors.textSecondary} />}
            label="Preferences"
            onPress={() => router.push(`/(app)/${workspaceSlug}/preferences`)}
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
        <Text style={{ color: theme.colors.dangerText, fontSize: 16, fontWeight: "600" }}>Sign Out</Text>
      </Pressable>
    </ScrollView>
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
  theme: ReturnType<typeof useMobileTheme>["theme"];
  isLast?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? theme.colors.surfaceHover : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.borderSecondary,
      })}
    >
      <View style={{ marginRight: 14 }}>{icon}</View>
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 16 }}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.textFaint} />
    </Pressable>
  );
}
