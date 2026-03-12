import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import type { LinkPreview } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { openSafeUrl } from "@/utils/url-validation";

interface Props {
  preview: LinkPreview;
}

export function LinkPreviewCard({ preview }: Props) {
  const { theme } = useMobileTheme();
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  return (
    <Pressable
      testID="link-preview"
      onPress={() => openSafeUrl(preview.url)}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.borderDefault,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {preview.imageUrl && !imgError && (
        <Image
          testID="link-preview-image"
          source={{ uri: preview.imageUrl }}
          style={{ width: "100%", height: 160 }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      )}
      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          {preview.faviconUrl && !faviconError && (
            <Image
              testID="link-preview-favicon"
              source={{ uri: preview.faviconUrl }}
              style={{ width: 16, height: 16 }}
              onError={() => setFaviconError(true)}
            />
          )}
          {preview.siteName && (
            <Text
              testID="link-preview-site-name"
              style={{ fontSize: 12, color: theme.colors.textFaint }}
              numberOfLines={1}
            >
              {preview.siteName}
            </Text>
          )}
        </View>
        {preview.title && (
          <Text
            testID="link-preview-title"
            style={{ fontSize: 14, fontWeight: "600", color: theme.brand.primary }}
            numberOfLines={2}
          >
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text
            testID="link-preview-description"
            style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
