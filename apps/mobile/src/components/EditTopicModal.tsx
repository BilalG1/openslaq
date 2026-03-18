import { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentDescription: string | null | undefined;
  onSave: (description: string | null) => Promise<void>;
}

export function EditTopicModal({
  visible,
  onClose,
  currentDescription,
  onSave,
}: Props) {
  const { theme } = useMobileTheme();
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
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(null);
      onClose();
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
        style={{
          marginBottom: 12,
          minHeight: 80,
          textAlignVertical: "top",
        }}
      />

      <Pressable
        testID="edit-topic-save"
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          backgroundColor: saving
            ? theme.colors.surfaceTertiary
            : theme.brand.primary,
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: "center",
          marginBottom: currentDescription ? 8 : 0,
        })}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Save
          </Text>
        )}
      </Pressable>

      {currentDescription && (
        <Pressable
          testID="edit-topic-clear"
          onPress={handleClear}
          disabled={saving}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
          })}
        >
          <Text style={{ color: theme.colors.dangerText, fontWeight: "500", fontSize: 16 }}>
            Clear Topic
          </Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}
