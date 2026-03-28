import { useCallback, useMemo, useState } from "react";
import { ScrollView, View, Image, Text, Pressable, StyleSheet } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { PendingFile } from "@/hooks/useFileUpload";

interface Props {
  files: PendingFile[];
  onRemove: (id: string) => void;
}

function getExtension(name: string): string {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1] : "";
  return ext ? ext.toUpperCase() : "FILE";
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    scrollContainer: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
    },
    fileItem: {
      marginRight: 8,
      position: "relative",
    },
    imagePreview: {
      borderRadius: 8,
      width: 60,
      height: 60,
    },
    filePlaceholder: {
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      width: 60,
      height: 60,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    fileExtension: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.colors.textMuted,
    },
    removeButton: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.borderStrong,
    },
    removeButtonText: {
      color: theme.colors.headerText,
      fontSize: 12,
      fontWeight: "bold",
    },
  });

export function FilePreviewStrip({ files, onRemove }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((id: string) => {
    setFailedIds((prev) => new Set(prev).add(id));
  }, []);

  if (files.length === 0) return null;

  return (
    <ScrollView
      testID="file-preview-strip"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollContainer}
    >
      {files.map((file) => (
        <View key={file.id} style={styles.fileItem}>
          {file.isImage && !failedIds.has(file.id) ? (
            <Image
              testID={`file-preview-${file.id}`}
              source={{ uri: file.uri }}
              style={styles.imagePreview}
              onError={() => handleImageError(file.id)}
            />
          ) : (
            <View
              testID={`file-preview-${file.id}`}
              style={styles.filePlaceholder}
            >
              <Text style={styles.fileExtension}>
                {getExtension(file.name)}
              </Text>
            </View>
          )}
          <Pressable
            testID={`file-remove-${file.id}`}
            onPress={() => onRemove(file.id)}
            hitSlop={12}
            accessibilityLabel={`Remove ${file.name}`}
            accessibilityHint="Removes this file from the upload list"
            style={styles.removeButton}
          >
            <Text style={styles.removeButtonText}>X</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
