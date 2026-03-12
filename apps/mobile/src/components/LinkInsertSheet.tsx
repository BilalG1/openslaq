import { useState } from "react";
import { Modal, Pressable, Text, TextInput } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { isSafeUrl } from "@/utils/url-validation";

interface Props {
  visible: boolean;
  initialText: string;
  onInsert: (text: string, url: string) => void;
  onClose: () => void;
}

export function LinkInsertSheet({ visible, initialText, onInsert, onClose }: Props) {
  const { theme } = useMobileTheme();
  const [displayText, setDisplayText] = useState(initialText);
  const [url, setUrl] = useState("");

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed || !isSafeUrl(trimmed)) return;
    onInsert(displayText || url, trimmed);
    setDisplayText("");
    setUrl("");
  };

  const handleClose = () => {
    setDisplayText("");
    setUrl("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        testID="link-sheet-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable
          testID="link-sheet-content"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 34,
            paddingTop: 12,
            paddingHorizontal: 16,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 12 }}>
            Insert link
          </Text>

          <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
            Display text
          </Text>
          <TextInput
            testID="link-text-input"
            value={displayText}
            onChangeText={setDisplayText}
            placeholder="Link text"
            placeholderTextColor={theme.colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 14,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceTertiary,
              marginBottom: 12,
            }}
          />

          <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
            URL
          </Text>
          <TextInput
            testID="link-url-input"
            value={url}
            onChangeText={setUrl}
            placeholder="https://"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 14,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceTertiary,
              marginBottom: 16,
            }}
          />

          <Pressable
            testID="link-insert-button"
            onPress={handleInsert}
            disabled={!url.trim() || !isSafeUrl(url.trim())}
            style={{
              backgroundColor: url.trim() && isSafeUrl(url.trim()) ? theme.brand.primary : theme.colors.borderStrong,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Insert</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
