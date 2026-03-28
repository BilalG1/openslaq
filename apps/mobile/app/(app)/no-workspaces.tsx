import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { JoinWorkspaceForm } from "@/components/workspace/JoinWorkspaceForm";
import { routes } from "@/lib/routes";
import type { MobileTheme } from "@openslaq/shared";

export default function NoWorkspacesScreen() {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View testID="no-workspaces-screen" style={styles.inner}>
        <Text style={styles.title}>Welcome to OpenSlaq</Text>
        <Text style={styles.subtitle}>Join an existing workspace or create a new one</Text>

        <JoinWorkspaceForm onJoined={(slug) => router.replace(routes.channels(slug))} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          testID="create-workspace-button"
          onPress={() => router.push("/(app)/create-workspace")}
          accessibilityRole="button"
          accessibilityLabel="Create a Workspace"
          accessibilityHint="Navigates to create a new workspace"
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center" as const,
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
          })}
        >
          <Text style={styles.createButtonText}>Create a Workspace</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    kav: { flex: 1, backgroundColor: theme.colors.surface },
    inner: { flex: 1, padding: 24, justifyContent: "center" },
    title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 8 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: "center", marginBottom: 32 },
    dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.borderDefault },
    dividerText: { color: theme.colors.textFaint, fontSize: 13, marginHorizontal: 12 },
    createButtonText: { color: theme.colors.textPrimary, fontWeight: "600", fontSize: 16 },
  });
