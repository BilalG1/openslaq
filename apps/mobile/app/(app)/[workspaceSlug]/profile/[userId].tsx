import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { listWorkspaceMembers, createDm, type WorkspaceMember, type PresenceEntry } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { SetStatusModal } from "@/components/SetStatusModal";
import { useOperationDeps, useApiDeps } from "@/hooks/useOperationDeps";
import { routes } from "@/lib/routes";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

function roleBadgeColor(role: string, theme: ReturnType<typeof useMobileTheme>["theme"]): string {
  switch (role) {
    case "owner":
      return "#d97706";
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
  const { workspaceSlug, userId } = useLocalSearchParams<{
    workspaceSlug: string;
    userId: string;
  }>();
  const { user: currentUser } = useAuth();
  const { state, dispatch } = useChatStore();
  const deps = useOperationDeps();
  const apiDeps = useApiDeps();
  const { joinHuddle } = useHuddle();
  const router = useRouter();
  const { theme } = useMobileTheme();

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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <Text style={{ color: theme.colors.textFaint }}>User not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        testID="profile-screen"
        style={{ flex: 1, backgroundColor: theme.colors.surface }}
        contentContainerStyle={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }}
      >
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: theme.colors.surfaceTertiary,
              marginBottom: 16,
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
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 36, fontWeight: "700" }}>
              {getInitials(member.displayName)}
            </Text>
          </View>
        )}

        <Text
          testID="profile-display-name"
          style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 4 }}
        >
          {member.displayName}
        </Text>

        <Text
          testID="profile-email"
          style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 4 }}
        >
          {member.email}
        </Text>

        {/* Status display */}
        {hasStatus && presence && (
          <View testID="profile-status" style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}>
            {presence.statusEmoji && <Text style={{ fontSize: 14 }}>{presence.statusEmoji}</Text>}
            {presence.statusText && (
              <Text style={{ fontSize: 14, color: theme.colors.textMuted }}>{presence.statusText}</Text>
            )}
          </View>
        )}

        {/* Role badge + presence */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 4 }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: theme.colors.surfaceTertiary,
              marginRight: 8,
            }}
          >
            <Text style={{ color: roleBadgeColor(member.role, theme), fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>
              {member.role}
            </Text>
          </View>

          <View testID="profile-presence" style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: presenceInfo.online ? "#22c55e" : "#9ca3af",
                marginRight: 4,
              }}
            />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {presenceInfo.label}
            </Text>
          </View>
        </View>

        {/* Member since */}
        {member.joinedAt && (
          <Text
            testID="profile-member-since"
            style={{ color: theme.colors.textFaint, fontSize: 12, marginBottom: 16 }}
          >
            Member since {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
        )}

        {/* Own profile actions */}
        {isOwnProfile && (
          <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
            <Pressable
              testID="profile-edit-status"
              onPress={() => setStatusModalVisible(true)}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }}>
                {hasStatus ? "Edit Status" : "Set a status"}
              </Text>
            </Pressable>
            <Pressable
              testID="profile-edit-profile"
              onPress={() => router.push(routes.settings(workspaceSlug))}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }}>
                Edit Profile
              </Text>
            </Pressable>
          </View>
        )}

        {/* Other user actions: Message + Huddle */}
        {!isOwnProfile && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Pressable
              testID="profile-send-message"
              onPress={handleSendMessage}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? theme.brand.primary + "dd" : theme.brand.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
              })}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Message</Text>
            </Pressable>
            <Pressable
              testID="profile-huddle"
              onPress={handleHuddle}
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
              <Text style={{ color: theme.brand.primary, fontSize: 16, fontWeight: "600" }}>Huddle</Text>
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
          userId={userId}
          deps={apiDeps}
          dispatch={dispatch}
        />
      )}
    </>
  );
}
