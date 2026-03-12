import { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
} from "react-native";
import { Lock } from "lucide-react-native";
import type { Channel } from "@openslaq/shared";
import { createChannel } from "@openslaq/client-core";
import type { OperationDeps } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  visible: boolean;
  onClose: () => void;
  workspaceSlug: string;
  canCreatePrivate: boolean;
  deps: OperationDeps;
  onCreated: (channel: Channel) => void;
}

export function CreateChannelModal({
  visible,
  onClose,
  workspaceSlug,
  canCreatePrivate,
  deps,
  onCreated,
}: Props) {
  const { theme } = useMobileTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsPrivate(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const channel = await createChannel(deps, {
        workspaceSlug,
        name: name.trim(),
        type: isPrivate ? "private" : "public",
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      setIsPrivate(false);
      onCreated(channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          testID="create-channel-backdrop"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={handleClose}
        >
          <Pressable
            testID="create-channel-modal"
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: 34,
              paddingTop: 16,
              paddingHorizontal: 16,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              testID="create-channel-scroll"
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.textPrimary,
              marginBottom: 16,
            }}
          >
            Create Channel
          </Text>

          <TextInput
            testID="create-channel-name-input"
            placeholder="Channel name"
            placeholderTextColor={theme.colors.textFaint}
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 16,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSecondary,
              marginBottom: 12,
            }}
          />

          <TextInput
            testID="create-channel-description-input"
            placeholder="Description (optional)"
            placeholderTextColor={theme.colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 16,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSecondary,
              marginBottom: 12,
              minHeight: 60,
              textAlignVertical: "top",
            }}
          />

          {canCreatePrivate && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <Pressable
                testID="create-channel-type-public"
                onPress={() => setIsPrivate(false)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: !isPrivate ? theme.brand.primary : theme.colors.borderDefault,
                  backgroundColor: !isPrivate ? theme.brand.primary + "15" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: !isPrivate ? theme.brand.primary : theme.colors.textSecondary, fontWeight: "500" }}>
                  # Public
                </Text>
              </Pressable>
              <Pressable
                testID="create-channel-type-private"
                onPress={() => setIsPrivate(true)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isPrivate ? theme.brand.primary : theme.colors.borderDefault,
                  backgroundColor: isPrivate ? theme.brand.primary + "15" : "transparent",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Lock size={14} color={isPrivate ? theme.brand.primary : theme.colors.textSecondary} />
                  <Text style={{ color: isPrivate ? theme.brand.primary : theme.colors.textSecondary, fontWeight: "500" }}>
                    Private
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {error && (
            <Text
              testID="create-channel-error"
              style={{ color: theme.colors.dangerText, marginBottom: 12, fontSize: 14 }}
            >
              {error}
            </Text>
          )}

          <Pressable
            testID="create-channel-submit"
            onPress={handleSubmit}
            disabled={!name.trim() || loading}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              backgroundColor: !name.trim() || loading
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
                Create Channel
              </Text>
            )}
          </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
