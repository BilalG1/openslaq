import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import { EmojiPickerSheet } from "./EmojiPickerSheet";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentEmoji?: string | null;
  currentText?: string | null;
  userId: string;
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
    } finally {
      setSaving(false);
    }
  }, [deps, userId, dispatch, onClose]);

  const hasCurrentStatus = Boolean(currentEmoji || currentText);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable
          testID="set-status-backdrop"
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          onPress={onClose}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable
              testID="set-status-modal"
              style={{
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingTop: 16,
                paddingBottom: 34,
                paddingHorizontal: 16,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.textPrimary,
                  marginBottom: 16,
                }}
              >
                Set a status
              </Text>

              {/* Emoji + Text input row */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <Pressable
                  testID="status-emoji-field"
                  onPress={() => setEmojiPickerVisible(true)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.borderDefault,
                    backgroundColor: theme.colors.surfaceSecondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>
                    {emoji || "\u{1F600}"}
                  </Text>
                </Pressable>
                <TextInput
                  testID="status-text-input"
                  value={text}
                  onChangeText={setText}
                  placeholder="What's your status?"
                  placeholderTextColor={theme.colors.textFaint}
                  maxLength={100}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.borderDefault,
                    backgroundColor: theme.colors.surfaceSecondary,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: theme.colors.textPrimary,
                  }}
                />
              </View>

              {/* Preset buttons */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {STATUS_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.text}
                      testID={`status-preset-${preset.text.toLowerCase().replace(/\s+/g, "-")}`}
                      onPress={() => handlePreset(preset)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.borderDefault,
                        backgroundColor: theme.colors.surfaceSecondary,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{preset.emoji}</Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {preset.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Duration chips */}
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.textMuted,
                  marginBottom: 8,
                }}
              >
                Clear after
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {DURATION_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      testID={`status-duration-${opt}`}
                      onPress={() => setDuration(opt)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor:
                          duration === opt
                            ? theme.brand.primary
                            : theme.colors.surfaceSecondary,
                        borderWidth: duration === opt ? 0 : 1,
                        borderColor: theme.colors.borderDefault,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color:
                            duration === opt
                              ? "#fff"
                              : theme.colors.textPrimary,
                          fontWeight: duration === opt ? "600" : "400",
                        }}
                      >
                        {DURATION_LABELS[opt]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                {hasCurrentStatus && (
                  <Pressable
                    testID="clear-status-button"
                    onPress={handleClear}
                    disabled={saving}
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
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.colors.textPrimary,
                      }}
                    >
                      Clear Status
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  testID="save-status-button"
                  onPress={handleSave}
                  disabled={saving || (!emoji && !text)}
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
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#fff",
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <EmojiPickerSheet
        visible={emojiPickerVisible}
        onSelect={(e) => setEmoji(e)}
        onClose={() => setEmojiPickerVisible(false)}
      />
    </>
  );
}
