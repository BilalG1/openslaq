import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import EmojiPicker from "rn-emoji-keyboard";
import type { EmojiType } from "rn-emoji-keyboard";
import type { CustomEmoji } from "@openslaq/shared";
import { buildCustomEmojiShortcode } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  customEmojis?: CustomEmoji[];
}

export function EmojiPickerSheet({ visible, onSelect, onClose, customEmojis = [] }: Props) {
  const { theme, mode } = useMobileTheme();
  const [showCustom, setShowCustom] = useState(false);

  const pickerTheme = useMemo(
    () =>
      mode === "dark"
        ? {
            backdrop: "#00000055",
            container: theme.colors.surfaceSecondary,
            header: theme.colors.textPrimary,
            knob: theme.colors.textMuted,
            category: {
              icon: theme.colors.textMuted,
              iconActive: theme.brand.primary,
              container: theme.colors.surfaceSecondary,
              containerActive: theme.colors.surfaceTertiary,
            },
            search: {
              background: theme.colors.surfaceTertiary,
              text: theme.colors.textPrimary,
              placeholder: theme.colors.textFaint,
              icon: theme.colors.textMuted,
            },
          }
        : { backdrop: "#00000055" },
    [mode, theme],
  );

  const handlePick = useCallback(
    (emoji: EmojiType) => {
      haptics.light();
      onSelect(emoji.emoji);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleCustomPick = useCallback(
    (emoji: CustomEmoji) => {
      haptics.light();
      onSelect(buildCustomEmojiShortcode(emoji.name));
      setShowCustom(false);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleClose = useCallback(() => {
    setShowCustom(false);
    onClose();
  }, [onClose]);

  // Custom emoji grid shown as a separate bottom sheet
  if (showCustom && visible && customEmojis.length > 0) {
    return (
      <BottomSheet visible onClose={handleClose} scrollable maxHeight={320} testID="custom-emoji-section">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 16 }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            Custom
          </Text>
          <Pressable testID="custom-emoji-back" onPress={() => setShowCustom(false)}>
            <Text style={{ color: theme.brand.primary, fontSize: 14 }}>Standard</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>
          {customEmojis.map((emoji) => (
            <Pressable
              key={emoji.id}
              testID={`custom-emoji-${emoji.name}`}
              onPress={() => handleCustomPick(emoji)}
              accessibilityLabel={emoji.name}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
            >
              <Image
                source={{ uri: emoji.url }}
                style={{ width: 36, height: 36 }}
                accessibilityLabel={emoji.name}
              />
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    );
  }

  return (
    <View>
      {visible && customEmojis.length > 0 && (
        <View
          testID="custom-emoji-tab-container"
          style={{
            position: "absolute",
            bottom: 50,
            alignSelf: "center",
            zIndex: 10,
          }}
        >
          <Pressable
            testID="custom-emoji-tab"
            onPress={() => setShowCustom(true)}
            style={{
              backgroundColor: theme.brand.primary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              Custom ({customEmojis.length})
            </Text>
          </Pressable>
        </View>
      )}
      <EmojiPicker
        open={visible}
        onEmojiSelected={handlePick}
        onClose={handleClose}
        theme={pickerTheme}
        enableSearchBar
        categoryPosition="top"
      />
    </View>
  );
}
