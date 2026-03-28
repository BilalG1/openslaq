import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import {
  Pressable,
  Text,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentDescription: string | null | undefined;
  onSave: (description: string | null) => Promise<void>;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    input: {
      marginBottom: 12,
      minHeight: 80,
      textAlignVertical: "top",
    },
    saveButtonText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 16,
    },
    clearButtonText: {
      color: theme.colors.dangerText,
      fontWeight: "500",
      fontSize: 16,
    },
  });

export function EditTopicModal({
  visible,
  onClose,
  currentDescription,
  onSave,
}: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [draft, setDraft] = useState(currentDescription ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(currentDescription ?? "");
    }
  }, [visible, currentDescription]);

  const handleSave = async () => {
    Keyboard.dismiss();
    setSaving(true);
    try {
      await onSave(draft.trim() || null);
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save topic");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(null);
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to clear topic");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Edit Topic"
      avoidKeyboard
      scrollable
      testID="edit-topic-modal"
    >
      <Input
        testID="edit-topic-input"
        placeholder="Set a topic for this channel..."
        placeholderTextColor={theme.colors.textFaint}
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={500}
        style={styles.input}
      />

      <Pressable
        testID="edit-topic-save"
        onPress={handleSave}
        disabled={saving}
        accessibilityLabel="Save topic"
        accessibilityHint="Saves the topic for this channel"
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          backgroundColor: saving
            ? theme.colors.surfaceTertiary
            : theme.brand.primary,
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: "center" as const,
          marginBottom: currentDescription ? 8 : 0,
        })}
      >
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.headerText} />
        ) : (
          <Text style={styles.saveButtonText}>
            Save
          </Text>
        )}
      </Pressable>

      {currentDescription && (
        <Pressable
          testID="edit-topic-clear"
          onPress={handleClear}
          disabled={saving}
          accessibilityLabel="Clear topic"
          accessibilityHint="Removes the current topic from this channel"
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center" as const,
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
          })}
        >
          <Text style={styles.clearButtonText}>
            Clear Topic
          </Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}
