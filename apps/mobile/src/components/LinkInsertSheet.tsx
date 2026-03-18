import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { isSafeUrl } from "@/utils/url-validation";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";

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
    <BottomSheet visible={visible} onClose={handleClose} title="Insert link" avoidKeyboard testID="link-sheet-content">
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
        Display text
      </Text>
      <Input
        testID="link-text-input"
        value={displayText}
        onChangeText={setDisplayText}
        placeholder="Link text"
        style={{
          paddingVertical: 8,
          fontSize: 14,
          backgroundColor: theme.colors.surfaceTertiary,
          marginBottom: 12,
        }}
      />

      <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
        URL
      </Text>
      <Input
        testID="link-url-input"
        value={url}
        onChangeText={setUrl}
        placeholder="https://"
        autoCapitalize="none"
        keyboardType="url"
        style={{
          paddingVertical: 8,
          fontSize: 14,
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
    </BottomSheet>
  );
}
