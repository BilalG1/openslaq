import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  STATUS_PRESETS,
  DURATION_OPTIONS,
  DURATION_LABELS,
  durationToExpiresAt,
  setUserStatus,
  clearUserStatus,
  handleUserStatusUpdated,
  type DurationOption,
  type ApiDeps,
} from "@openslaq/client-core";
import type { ChatAction } from "@openslaq/client-core";
import type { UserId } from "@openslaq/shared";
import { EmojiPickerSheet } from "./EmojiPickerSheet";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentEmoji?: string | null;
  currentText?: string | null;
  userId: UserId;
  deps: ApiDeps;
  dispatch: (action: ChatAction) => void;
}

export function SetStatusModal({
  visible,
  onClose,
  currentEmoji,
  currentText,
  userId,
  deps,
  dispatch,
}: Props) {
  const { theme } = useMobileTheme();
  const [emoji, setEmoji] = useState(currentEmoji ?? "");
  const [text, setText] = useState(currentText ?? "");
  const [duration, setDuration] = useState<DurationOption>("dont_clear");
  const [saving, setSaving] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmoji(currentEmoji ?? "");
      setText(currentText ?? "");
      setDuration("dont_clear");
    }
  }, [visible, currentEmoji, currentText]);

  const handlePreset = useCallback(
    (preset: (typeof STATUS_PRESETS)[number]) => {
      setEmoji(preset.emoji);
      setText(preset.text);
      setDuration(preset.duration);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await setUserStatus(deps, {
        emoji: emoji || undefined,
        text: text || undefined,
        expiresAt: durationToExpiresAt(duration),
      });
      dispatch(
        handleUserStatusUpdated({
          userId,
          statusEmoji: result.statusEmoji,
          statusText: result.statusText,
          statusExpiresAt: result.statusExpiresAt,
        }),
      );
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to set status");
    } finally {
      setSaving(false);
    }
  }, [deps, emoji, text, duration, userId, dispatch, onClose]);

  const handleClear = useCallback(async () => {
    setSaving(true);
    try {
      await clearUserStatus(deps);
      dispatch(
        handleUserStatusUpdated({
          userId,
          statusEmoji: null,
          statusText: null,
          statusExpiresAt: null,
        }),
      );
      setEmoji("");
      setText("");
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to clear status");
    } finally {
      setSaving(false);
    }
  }, [deps, userId, dispatch, onClose]);

  const hasCurrentStatus = Boolean(currentEmoji || currentText);

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title="Set a status" avoidKeyboard testID="set-status-modal">
        {/* Emoji + Text input row */}
        <View style={styles.inputRow}>
          <Pressable
            testID="status-emoji-field"
            onPress={() => setEmojiPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select emoji"
            accessibilityHint="Opens emoji picker to choose a status emoji"
            style={[styles.emojiButton, {
              borderColor: theme.colors.borderDefault,
              backgroundColor: theme.colors.surfaceSecondary,
            }]}
          >
            <Text style={styles.emojiText}>
              {emoji || "\u{1F600}"}
            </Text>
          </Pressable>
          <Input
            testID="status-text-input"
            value={text}
            onChangeText={setText}
            placeholder="What's your status?"
            placeholderTextColor={theme.colors.textFaint}
            maxLength={100}
            style={styles.textInput}
          />
        </View>

        {/* Preset buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsScroll}
        >
          <View style={styles.presetsRow}>
            {STATUS_PRESETS.map((preset) => (
              <Pressable
                key={preset.text}
                testID={`status-preset-${preset.text.toLowerCase().replace(/\s+/g, "-")}`}
                onPress={() => handlePreset(preset)}
                accessibilityRole="button"
                accessibilityLabel={`${preset.emoji} ${preset.text}`}
                accessibilityHint={`Sets status to ${preset.text}`}
                style={[styles.presetButton, {
                  borderColor: theme.colors.borderDefault,
                  backgroundColor: theme.colors.surfaceSecondary,
                }]}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text
                  style={[styles.presetText, { color: theme.colors.textPrimary }]}
                >
                  {preset.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Duration chips */}
        <Text
          style={[styles.clearAfterLabel, { color: theme.colors.textMuted }]}
        >
          Clear after
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.durationScroll}
        >
          <View style={styles.presetsRow}>
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = duration === opt;
              return (
                <Pressable
                  key={opt}
                  testID={`status-duration-${opt}`}
                  onPress={() => setDuration(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={DURATION_LABELS[opt]}
                  accessibilityHint={`Sets clear duration to ${DURATION_LABELS[opt]}`}
                  style={[
                    styles.durationChip,
                    isSelected ? styles.durationChipSelected : styles.durationChipUnselected,
                    {
                      backgroundColor: isSelected
                        ? theme.brand.primary
                        : theme.colors.surfaceSecondary,
                      borderColor: theme.colors.borderDefault,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      isSelected ? styles.durationTextSelected : styles.durationTextUnselected,
                      {
                        color: isSelected
                          ? theme.colors.headerText
                          : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {DURATION_LABELS[opt]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {hasCurrentStatus && (
            <Pressable
              testID="clear-status-button"
              onPress={handleClear}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Clear status"
              accessibilityHint="Clears your current status"
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.borderDefault,
                alignItems: "center",
                opacity: pressed || saving ? 0.6 : 1,
              })}
            >
              <Text
                style={[styles.clearButtonText, { color: theme.colors.textPrimary }]}
              >
                Clear Status
              </Text>
            </Pressable>
          )}
          <Pressable
            testID="save-status-button"
            onPress={handleSave}
            disabled={saving || (!emoji && !text)}
            accessibilityRole="button"
            accessibilityLabel={saving ? "Saving status" : "Save status"}
            accessibilityHint="Saves your status"
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              borderRadius: 8,
              backgroundColor: theme.brand.primary,
              alignItems: "center",
              opacity:
                pressed || saving || (!emoji && !text) ? 0.5 : 1,
            })}
          >
            <Text
              style={[styles.saveButtonText, { color: theme.colors.headerText }]}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      <EmojiPickerSheet
        visible={emojiPickerVisible}
        onSelect={(e) => setEmoji(e)}
        onClose={() => setEmojiPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    height: 48,
  },
  presetsScroll: {
    marginBottom: 16,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetEmoji: {
    fontSize: 14,
  },
  presetText: {
    fontSize: 13,
  },
  clearAfterLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  durationScroll: {
    marginBottom: 20,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  durationChipSelected: {
    borderWidth: 0,
  },
  durationChipUnselected: {
    borderWidth: 1,
  },
  durationText: {
    fontSize: 13,
  },
  durationTextSelected: {
    fontWeight: "600",
  },
  durationTextUnselected: {
    fontWeight: "400",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
