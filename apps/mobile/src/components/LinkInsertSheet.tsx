import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { isSafeUrl } from "@/utils/url-validation";
import { Input } from "@/components/ui/Input";

import { BACKDROP_BG } from "@/theme/constants";

interface Props {
  visible: boolean;
  initialText: string;
  onInsert: (text: string, url: string) => void;
  onClose: () => void;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: BACKDROP_BG,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    contentBackdrop: {
      flex: 1,
      backgroundColor: BACKDROP_BG,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      alignSelf: "stretch",
    },
    dialog: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      width: "100%",
      maxWidth: 320,
      padding: 20,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    input: {
      paddingVertical: 8,
      fontSize: 14,
      backgroundColor: theme.colors.surfaceTertiary,
      marginBottom: 12,
    },
    urlInput: {
      paddingVertical: 8,
      fontSize: 14,
      backgroundColor: theme.colors.surfaceTertiary,
      marginBottom: 16,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 8,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontWeight: "600",
      fontSize: 16,
    },
    buttonEnabled: {
      flex: 1,
      backgroundColor: theme.brand.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    buttonDisabled: {
      flex: 1,
      backgroundColor: theme.colors.borderStrong,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    buttonText: {
      color: theme.colors.headerText,
      fontWeight: "600",
      fontSize: 16,
    },
  });

export function LinkInsertSheet({ visible, initialText, onInsert, onClose }: Props) {
  const { theme } = useMobileTheme();
  const [displayText, setDisplayText] = useState(initialText);
  const [url, setUrl] = useState("");
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const isValid = url.trim() && isSafeUrl(url.trim());

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
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable testID="link-sheet-content-backdrop" style={styles.contentBackdrop} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close dialog" accessibilityHint="Dismisses the link insert dialog">
          <Pressable style={styles.dialog} testID="link-sheet-content" onPress={(e) => e.stopPropagation()} accessibilityRole="none">
            <Text style={styles.title}>Insert link</Text>

            <Text style={styles.label}>Display text</Text>
            <Input
              testID="link-text-input"
              value={displayText}
              onChangeText={setDisplayText}
              placeholder="Link text"
              style={styles.input}
            />

            <Text style={styles.label}>URL</Text>
            <Input
              testID="link-url-input"
              value={url}
              onChangeText={setUrl}
              placeholder="https://"
              autoCapitalize="none"
              keyboardType="url"
              style={styles.urlInput}
            />

            <View style={styles.buttonRow}>
              <Pressable
                testID="link-cancel-button"
                onPress={handleClose}
                style={styles.cancelButton}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityHint="Closes the link dialog"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="link-insert-button"
                onPress={handleInsert}
                disabled={!isValid}
                style={isValid ? styles.buttonEnabled : styles.buttonDisabled}
                accessibilityRole="button"
                accessibilityLabel="Insert link"
                accessibilityHint="Inserts the link into the message"
              >
                <Text style={styles.buttonText}>Insert</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
