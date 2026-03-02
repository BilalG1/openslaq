import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { createWorkspace } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";

export default function CreateWorkspaceScreen() {
  const { authProvider } = useAuth();
  const { theme } = useMobileTheme();
  const router = useRouter();

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
      router.replace(`/(app)/${result.slug}/(channels)`);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        testID="create-workspace-screen"
        style={{ flex: 1, padding: 24, justifyContent: "flex-start", paddingTop: 32 }}
      >
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: 13,
            fontWeight: "600",
            marginBottom: 6,
          }}
        >
          Workspace Name
        </Text>
        <TextInput
          testID="create-workspace-name-input"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Acme Corp"
          placeholderTextColor={theme.colors.textFaint}
          autoFocus
          style={{
            backgroundColor: theme.colors.surfaceSecondary,
            color: theme.colors.textPrimary,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
            marginBottom: 16,
          }}
        />

        {error && (
          <Text
            testID="create-workspace-error"
            style={{ color: theme.colors.dangerText, marginBottom: 12, fontSize: 14 }}
          >
            {error}
          </Text>
        )}

        <Pressable
          testID="create-workspace-submit"
          onPress={handleCreate}
          disabled={!name.trim() || loading}
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
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Create Workspace
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
