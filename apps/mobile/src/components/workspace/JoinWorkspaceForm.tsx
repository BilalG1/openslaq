import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { getInvite, acceptInvite } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";

function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/invite\/([^/?#]+)/);
  return match?.[1] ?? trimmed;
}

interface JoinWorkspaceFormProps {
  onJoined: (slug: string) => void;
}

export function JoinWorkspaceForm({ onJoined }: JoinWorkspaceFormProps) {
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);

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
      onJoined(result.slug);
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
    <View>
      <Text style={styles.sectionLabel}>Join with Invite Link</Text>

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
            style={styles.input}
            accessibilityLabel="Invite link or code"
            accessibilityHint="Paste an invite link or code to join a workspace"
          />
          <Pressable
            testID="invite-lookup-button"
            onPress={handleLookupInvite}
            disabled={!inviteInput.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Join Workspace"
            accessibilityHint="Looks up the invite and joins the workspace"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              backgroundColor: !inviteInput.trim() || loading ? theme.colors.surfaceTertiary : theme.brand.primary,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: "center" as const,
              marginBottom: 8,
            })}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.headerText} />
            ) : (
              <Text style={styles.primaryButtonText}>Join Workspace</Text>
            )}
          </Pressable>
        </>
      ) : (
        <View style={styles.previewCard}>
          <Text style={styles.previewName}>{previewName}</Text>
          <Text style={styles.previewSubtitle}>You've been invited to join this workspace</Text>

          <View style={styles.previewActions}>
            <Pressable
              testID="invite-accept-button"
              onPress={handleAcceptInvite}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Join"
              accessibilityHint="Accepts the invite and joins the workspace"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: loading ? theme.colors.surfaceTertiary : theme.brand.primary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 20,
                flex: 1,
                alignItems: "center" as const,
              })}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.headerText} />
              ) : (
                <Text style={styles.primaryButtonText}>Join</Text>
              )}
            </Pressable>

            <Pressable
              testID="invite-cancel-button"
              onPress={handleReset}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Cancels the invite lookup"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: theme.colors.surfaceTertiary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 20,
                alignItems: "center" as const,
              })}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {error && (
        <Text testID="join-workspace-error" style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    sectionLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
    input: { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, borderWidth: 1, borderColor: theme.colors.borderDefault, marginBottom: 12 },
    primaryButtonText: { color: theme.colors.headerText, fontWeight: "600", fontSize: 16 },
    previewCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.borderDefault },
    previewName: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "600", marginBottom: 4 },
    previewSubtitle: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 12 },
    previewActions: { flexDirection: "row", gap: 8 },
    cancelButtonText: { color: theme.colors.textSecondary, fontWeight: "600", fontSize: 15 },
    errorText: { color: theme.colors.dangerText, fontSize: 14, textAlign: "center", marginBottom: 8 },
  });
