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
      className="px-3 py-2"
      style={{ backgroundColor: theme.colors.surface }}
    >
      {files.map((file) => (
        <View key={file.id} className="mr-2 relative">
          {file.isImage ? (
            <Image
              testID={`file-preview-${file.id}`}
              source={{ uri: file.uri }}
              className="rounded-lg"
              style={{ width: 60, height: 60 }}
            />
          ) : (
            <View
              testID={`file-preview-${file.id}`}
              className="rounded-lg items-center justify-center"
              style={{
                width: 60,
                height: 60,
                backgroundColor: theme.colors.surfaceTertiary,
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: theme.colors.textMuted }}
              >
                {getExtension(file.name)}
              </Text>
            </View>
          )}
          <Pressable
            testID={`file-remove-${file.id}`}
            onPress={() => onRemove(file.id)}
            hitSlop={12}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.borderStrong }}
          >
            <Text className="text-white text-xs font-bold">X</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
