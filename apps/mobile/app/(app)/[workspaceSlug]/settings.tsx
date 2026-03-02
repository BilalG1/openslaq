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
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
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

  return (
    <ScrollView
      testID="settings-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 24 }}
    >
      {/* Workspace Settings link (admin/owner only) */}
      {isAdminOrOwner && (
        <Pressable
          testID="workspace-settings-link"
          onPress={() => router.push(`/(app)/${workspaceSlug}/workspace-settings`)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.colors.surfaceSecondary : theme.colors.surfaceTertiary,
            borderRadius: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          })}
        >
          <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "500" }}>
            Workspace Settings
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>{"\u203A"}</Text>
        </Pressable>
      )}

      {/* Notifications link */}
      <Pressable
        testID="notification-settings-link"
        onPress={() => router.push(`/(app)/${workspaceSlug}/notification-settings`)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? theme.colors.surfaceSecondary : theme.colors.surfaceTertiary,
          borderRadius: 10,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "500" }}>
          Notifications
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>{"\u203A"}</Text>
      </Pressable>

      {/* Preferences link */}
      <Pressable
        testID="preferences-link"
        onPress={() => router.push(`/(app)/${workspaceSlug}/preferences`)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? theme.colors.surfaceSecondary : theme.colors.surfaceTertiary,
          borderRadius: 10,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "500" }}>
          Preferences
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>{"\u203A"}</Text>
      </Pressable>

      {/* Avatar section */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        {profile?.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: theme.colors.surfaceTertiary,
              marginBottom: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: theme.brand.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 36, fontWeight: "700" }}>
              {getInitials(profile?.displayName)}
            </Text>
          </View>
        )}
        <Pressable
          testID="change-photo-button"
          onPress={handleChangePhoto}
          disabled={saving}
        >
          <Text style={{ color: theme.brand.primary, fontSize: 16 }}>Change Photo</Text>
        </Pressable>
      </View>

      {/* Display Name section */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
          Display Name
        </Text>
        <TextInput
          testID="settings-display-name-input"
          value={displayName}
          onChangeText={setDisplayName}
          style={{
            backgroundColor: theme.colors.surfaceSecondary,
            color: theme.colors.textPrimary,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
          }}
          placeholder="Display name"
          placeholderTextColor={theme.colors.textFaint}
        />
        {hasNameChanged && (
          <Pressable
            testID="settings-save-name"
            onPress={handleSaveName}
            disabled={saving || !displayName.trim()}
            style={({ pressed }) => ({
              backgroundColor: saving || !displayName.trim()
                ? theme.colors.surfaceTertiary
                : pressed
                  ? theme.brand.primary + "dd"
                  : theme.brand.primary,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 8,
            })}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Email section */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
          Email
        </Text>
        <Text
          testID="settings-email"
          style={{ color: theme.colors.textPrimary, fontSize: 16 }}
        >
          {profile?.email ?? ""}
        </Text>
      </View>

      {/* Sign Out */}
      <Pressable
        testID="settings-sign-out"
        onPress={handleSignOut}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#ef444422" : "transparent",
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#ef4444",
        })}
      >
        <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}
