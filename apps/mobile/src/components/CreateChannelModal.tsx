import { useMemo, useState } from "react";
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
  StyleSheet,
} from "react-native";
import { Lock } from "lucide-react-native";
import type { Channel, MobileTheme } from "@openslaq/shared";
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

import { TRANSPARENT } from "@/theme/constants";

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 34,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    heading: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 16,
    },
    nameInput: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSecondary,
      marginBottom: 12,
    },
    descriptionInput: {
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
    },
    typeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    lockIconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    errorText: {
      color: theme.colors.dangerText,
      marginBottom: 12,
      fontSize: 14,
    },
    submitButtonText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 16,
    },
  });

const makeTypeButtonStyles = (theme: MobileTheme, selected: boolean) =>
  StyleSheet.create({
    button: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: selected ? theme.brand.primary : theme.colors.borderDefault,
      backgroundColor: selected ? theme.brand.primary + "15" : TRANSPARENT,
      alignItems: "center",
    },
    label: {
      color: selected ? theme.brand.primary : theme.colors.textSecondary,
      fontWeight: "500",
    },
  });

export function CreateChannelModal({
  visible,
  onClose,
  workspaceSlug,
  canCreatePrivate,
  deps,
  onCreated,
}: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  const publicStyles = makeTypeButtonStyles(theme, !isPrivate);
  const privateStyles = makeTypeButtonStyles(theme, isPrivate);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          testID="create-channel-backdrop"
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel="Close modal"
          accessibilityHint="Closes the create channel modal"
        >
          <Pressable
            testID="create-channel-modal"
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
            accessibilityLabel="Create channel form"
            accessibilityHint="Fill in the form to create a new channel"
          >
            <ScrollView
              testID="create-channel-scroll"
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
          <Text style={styles.heading}>
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
            accessibilityLabel="Channel name"
            accessibilityHint="Enter the name for the new channel"
            style={styles.nameInput}
          />

          <TextInput
            testID="create-channel-description-input"
            placeholder="Description (optional)"
            placeholderTextColor={theme.colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            accessibilityLabel="Channel description"
            accessibilityHint="Enter an optional description for the channel"
            style={styles.descriptionInput}
          />

          {canCreatePrivate && (
            <View style={styles.typeRow}>
              <Pressable
                testID="create-channel-type-public"
                onPress={() => setIsPrivate(false)}
                accessibilityLabel="Public channel"
                accessibilityHint="Creates a public channel visible to all members"
                style={publicStyles.button}
              >
                <Text style={publicStyles.label}>
                  # Public
                </Text>
              </Pressable>
              <Pressable
                testID="create-channel-type-private"
                onPress={() => setIsPrivate(true)}
                accessibilityLabel="Private channel"
                accessibilityHint="Creates a private channel with restricted access"
                style={privateStyles.button}
              >
                <View style={styles.lockIconRow}>
                  <Lock size={14} color={isPrivate ? theme.brand.primary : theme.colors.textSecondary} />
                  <Text style={privateStyles.label}>
                    Private
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {error && (
            <Text
              testID="create-channel-error"
              style={styles.errorText}
            >
              {error}
            </Text>
          )}

          <Pressable
            testID="create-channel-submit"
            onPress={handleSubmit}
            disabled={!name.trim() || loading}
            accessibilityLabel="Create channel"
            accessibilityHint="Submits the form to create the channel"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              backgroundColor: !name.trim() || loading
                ? theme.colors.surfaceTertiary
                : theme.brand.primary,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: "center" as const,
            })}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.headerText} />
            ) : (
              <Text style={styles.submitButtonText}>
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
