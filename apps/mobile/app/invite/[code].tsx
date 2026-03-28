import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { getInvite, acceptInvite } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useInviteParams } from "@/hooks/useRouteParams";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useServer } from "@/contexts/ServerContext";
import { setPendingInvite } from "@/lib/pending-invite";
import { routes } from "@/lib/routes";
import type { MobileTheme } from "@openslaq/shared";

export default function InviteAcceptScreen() {
  const { code } = useInviteParams();
  const { isAuthenticated, authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      void setPendingInvite(code!).then(() => router.replace("/(auth)/sign-in"));
      return;
    }

    let cancelled = false;

    getInvite({ api, auth: authProvider }, code!).then(
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
      const result = await acceptInvite({ api, auth: authProvider }, code!);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View testID="invite-accept-screen" style={styles.container}>
      {loading ? (
        <ActivityIndicator testID="invite-loading" size="large" color={theme.brand.primary} />
      ) : error ? (
        <View style={styles.centeredContent}>
          <Text style={styles.errorTitle}>Invalid Invite</Text>
          <Text testID="invite-error" style={styles.errorMessage}>{error}</Text>
          <Pressable
            testID="invite-go-back"
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            accessibilityHint="Returns to the home screen"
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
            <Text style={styles.goBackText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.centeredContent}>
          <Text style={styles.inviteTitle}>You've been invited!</Text>

          <View testID="invite-preview-card" style={styles.previewCard}>
            <Text style={styles.workspaceName}>{workspaceName}</Text>
            <Text style={styles.inviteSubtitle}>You've been invited to join this workspace</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              testID="invite-accept-button"
              onPress={handleAccept}
              disabled={accepting}
              accessibilityRole="button"
              accessibilityLabel="Join"
              accessibilityHint="Accepts the invite and joins the workspace"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: accepting ? theme.colors.surfaceTertiary : theme.brand.primary,
                borderRadius: 8,
                paddingVertical: 12,
                flex: 1,
                alignItems: "center",
              })}
            >
              {accepting ? (
                <ActivityIndicator size="small" color={theme.colors.headerText} />
              ) : (
                <Text style={styles.joinText}>Join</Text>
              )}
            </Pressable>

            <Pressable
              testID="invite-cancel-button"
              onPress={handleCancel}
              disabled={accepting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Returns to the home screen"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: theme.colors.surfaceTertiary,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 20,
                alignItems: "center",
              })}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
    container: { flex: 1, backgroundColor: theme.colors.surface, padding: 24, justifyContent: "center" },
    centeredContent: { alignItems: "center" },
    errorTitle: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 8 },
    errorMessage: { color: theme.colors.dangerText, fontSize: 15, textAlign: "center", marginBottom: 24 },
    goBackText: { color: theme.colors.textPrimary, fontWeight: "600", fontSize: 16 },
    inviteTitle: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 8 },
    previewCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 8, padding: 16, marginBottom: 24, width: "100%", borderWidth: 1, borderColor: theme.colors.borderDefault },
    workspaceName: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "600", marginBottom: 4 },
    inviteSubtitle: { color: theme.colors.textSecondary, fontSize: 14 },
    buttonRow: { flexDirection: "row", gap: 8, width: "100%" },
    joinText: { color: theme.colors.headerText, fontWeight: "600", fontSize: 16 },
    cancelText: { color: theme.colors.textSecondary, fontWeight: "600", fontSize: 16 },
  });
