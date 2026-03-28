import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { createWorkspace } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useServer } from "@/contexts/ServerContext";
import { routes } from "@/lib/routes";
import type { MobileTheme } from "@openslaq/shared";

export default function CreateWorkspaceScreen() {
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const result = await createWorkspace({ api, auth: authProvider }, trimmed);

    if (result.ok) {
      router.replace(routes.channels(result.slug));
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View testID="create-workspace-screen" style={styles.inner}>
        <Text style={styles.label}>
          Workspace Name
        </Text>
        <TextInput
          testID="create-workspace-name-input"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Acme Corp"
          placeholderTextColor={theme.colors.textFaint}
          autoFocus
          style={styles.input}
          accessibilityLabel="Workspace name"
          accessibilityHint="Enter a name for your new workspace"
        />

        {error && (
          <Text testID="create-workspace-error" style={styles.errorText}>
            {error}
          </Text>
        )}

        <Pressable
          testID="create-workspace-submit"
          onPress={handleCreate}
          disabled={!name.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="Create Workspace"
          accessibilityHint="Creates a new workspace"
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            backgroundColor:
              !name.trim() || loading
                ? theme.colors.surfaceTertiary
                : theme.brand.primary,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
          })}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.headerText} />
          ) : (
            <Text style={styles.submitText}>
              Create Workspace
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    kav: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    inner: {
      flex: 1,
      padding: 24,
      justifyContent: "flex-start",
      paddingTop: 32,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
    },
    input: {
      backgroundColor: theme.colors.surfaceSecondary,
      color: theme.colors.textPrimary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      marginBottom: 16,
    },
    errorText: {
      color: theme.colors.dangerText,
      marginBottom: 12,
      fontSize: 14,
    },
    submitText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 16,
    },
  });
