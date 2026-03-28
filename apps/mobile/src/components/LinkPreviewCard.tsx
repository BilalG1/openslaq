import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import type { LinkPreview } from "@openslaq/shared";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { openSafeUrl } from "@/utils/url-validation";

interface Props {
  preview: LinkPreview;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 8,
      overflow: "hidden",
    },
    previewImage: {
      width: "100%",
      height: 160,
    },
    contentContainer: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    siteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    favicon: {
      width: 16,
      height: 16,
    },
    siteName: {
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.brand.primary,
    },
    description: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });

export function LinkPreviewCard({ preview }: Props) {
  const { theme } = useMobileTheme();
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      testID="link-preview"
      onPress={() => openSafeUrl(preview.url)}
      style={styles.container}
      accessibilityRole="link"
      accessibilityLabel={`Link preview: ${preview.title ?? preview.url}`}
      accessibilityHint="Opens the link in a browser"
    >
      {preview.imageUrl && !imgError && (
        <Image
          testID="link-preview-image"
          source={{ uri: preview.imageUrl }}
          style={styles.previewImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      )}
      <View style={styles.contentContainer}>
        <View style={styles.siteRow}>
          {preview.faviconUrl && !faviconError && (
            <Image
              testID="link-preview-favicon"
              source={{ uri: preview.faviconUrl }}
              style={styles.favicon}
              onError={() => setFaviconError(true)}
            />
          )}
          {preview.siteName && (
            <Text
              testID="link-preview-site-name"
              style={styles.siteName}
              numberOfLines={1}
            >
              {preview.siteName}
            </Text>
          )}
        </View>
        {preview.title && (
          <Text
            testID="link-preview-title"
            style={styles.title}
            numberOfLines={2}
          >
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text
            testID="link-preview-description"
            style={styles.description}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
