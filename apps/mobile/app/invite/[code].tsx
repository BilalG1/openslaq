import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getInvite, acceptInvite } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { setPendingInvite } from "@/lib/pending-invite";
import { routes } from "@/lib/routes";

export default function InviteAcceptScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated, authProvider } = useAuth();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setPendingInvite(code);
      router.replace("/(auth)/sign-in");
      return;
    }

    let cancelled = false;

    getInvite({ api, auth: authProvider }, code).then(
      (invite) => {
        if (cancelled) return;
        setWorkspaceName(invite.workspaceName);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError("Invalid or expired invite link");
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [code, isAuthenticated, authProvider, router]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const result = await acceptInvite({ api, auth: authProvider }, code);
      router.replace(routes.channels(result.slug));
    } catch {
      setError("Failed to join workspace");
      setAccepting(false);
    }
  };

  const handleCancel = () => {
    router.replace("/");
  };

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View
      testID="invite-accept-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 24, justifyContent: "center" }}
    >
      {loading ? (
        <ActivityIndicator testID="invite-loading" size="large" color={theme.brand.primary} />
      ) : error ? (
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: 24,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Invalid Invite
          </Text>
          <Text
            testID="invite-error"
            style={{
              color: theme.colors.dangerText,
              fontSize: 15,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {error}
          </Text>
          <Pressable
            testID="invite-go-back"
            onPress={handleCancel}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              backgroundColor: theme.colors.surfaceSecondary,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
            })}
          >
            <Text style={{ color: theme.colors.textPrimary, fontWeight: "600", fontSize: 16 }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: 24,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            You've been invited!
          </Text>

          {/* Workspace preview card */}
          <View
            testID="invite-preview-card"
            style={{
              backgroundColor: theme.colors.surfaceSecondary,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              width: "100%",
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              {workspaceName}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 14,
              }}
            >
              You've been invited to join this workspace
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
            <Pressable
              testID="invite-accept-button"
              onPress={handleAccept}
              disabled={accepting}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: accepting
                  ? theme.colors.surfaceTertiary
                  : theme.brand.primary,
                borderRadius: 8,
                paddingVertical: 12,
                flex: 1,
                alignItems: "center",
              })}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  Join
                </Text>
              )}
            </Pressable>

            <Pressable
              testID="invite-cancel-button"
              onPress={handleCancel}
              disabled={accepting}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: theme.colors.surfaceTertiary,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 20,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
