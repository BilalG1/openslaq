import { ScrollView, View, Image, Text, Pressable } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { PendingFile } from "@/hooks/useFileUpload";

interface Props {
  files: PendingFile[];
  onRemove: (id: string) => void;
}

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

export function FilePreviewStrip({ files, onRemove }: Props) {
  const { theme } = useMobileTheme();

  if (files.length === 0) return null;

  return (
    <ScrollView
      testID="file-preview-strip"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface }}
    >
      {files.map((file) => (
        <View key={file.id} style={{ marginRight: 8, position: 'relative' }}>
          {file.isImage ? (
            <Image
              testID={`file-preview-${file.id}`}
              source={{ uri: file.uri }}
              style={{ borderRadius: 8, width: 60, height: 60 }}
            />
          ) : (
            <View
              testID={`file-preview-${file.id}`}
              style={{
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                backgroundColor: theme.colors.surfaceTertiary,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted }}
              >
                {getExtension(file.name)}
              </Text>
            </View>
          )}
          <Pressable
            testID={`file-remove-${file.id}`}
            onPress={() => onRemove(file.id)}
            hitSlop={12}
            style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.borderStrong }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>X</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
