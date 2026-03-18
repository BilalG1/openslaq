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
import { getInvite, acceptInvite } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  // Support full URLs like https://openslaq.com/invite/abc123 or just the code
  const match = trimmed.match(/\/invite\/([^/?#]+)/);
  return match ? match[1] : trimmed;
}

export default function NoWorkspacesScreen() {
  const { authProvider } = useAuth();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleLookupInvite = async () => {
    const code = extractInviteCode(inviteInput);
    if (!code) return;

    setLoading(true);
    setError(null);
    setPreviewName(null);

    try {
      const invite = await getInvite({ api, auth: authProvider }, code);
      setPreviewName(invite.workspaceName);
      setInviteCode(code);
    } catch {
      setError("Invalid or expired invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteCode) return;

    setLoading(true);
    setError(null);

    try {
      const result = await acceptInvite({ api, auth: authProvider }, inviteCode);
      router.replace(routes.channels(result.slug));
    } catch {
      setError("Failed to join workspace");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreviewName(null);
    setInviteCode(null);
    setError(null);
    setInviteInput("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        testID="no-workspaces-screen"
        style={{ flex: 1, padding: 24, justifyContent: "center" }}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: 24,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Welcome to OpenSlaq
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: 15,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Join an existing workspace or create a new one
        </Text>

        {/* Join with invite section */}
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: 13,
            fontWeight: "600",
            marginBottom: 6,
          }}
        >
          Join with Invite Link
        </Text>

        {!previewName ? (
          <>
            <TextInput
              testID="invite-link-input"
              value={inviteInput}
              onChangeText={setInviteInput}
              placeholder="Paste invite link or code"
              placeholderTextColor={theme.colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                color: theme.colors.textPrimary,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                marginBottom: 12,
              }}
            />

            <Pressable
              testID="invite-lookup-button"
              onPress={handleLookupInvite}
              disabled={!inviteInput.trim() || loading}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor:
                  !inviteInput.trim() || loading
                    ? theme.colors.surfaceTertiary
                    : theme.brand.primary,
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: "center",
                marginBottom: 8,
              })}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  Join Workspace
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <View
            style={{
              backgroundColor: theme.colors.surfaceSecondary,
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
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
              {previewName}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              You've been invited to join this workspace
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                testID="invite-accept-button"
                onPress={handleAcceptInvite}
                disabled={loading}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: loading
                    ? theme.colors.surfaceTertiary
                    : theme.brand.primary,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  flex: 1,
                  alignItems: "center",
                })}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                    Join
                  </Text>
                )}
              </Pressable>

              <Pressable
                testID="invite-cancel-button"
                onPress={handleReset}
                disabled={loading}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: theme.colors.surfaceTertiary,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  alignItems: "center",
                })}
              >
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {error && (
          <Text
            testID="no-workspaces-error"
            style={{
              color: theme.colors.dangerText,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
        )}

        {/* Divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 20,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.colors.borderDefault,
            }}
          />
          <Text
            style={{
              color: theme.colors.textFaint,
              fontSize: 13,
              marginHorizontal: 12,
            }}
          >
            or
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.colors.borderDefault,
            }}
          />
        </View>

        {/* Create workspace button */}
        <Pressable
          testID="create-workspace-button"
          onPress={() => router.push("/(app)/create-workspace")}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
          })}
        >
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Create a Workspace
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
