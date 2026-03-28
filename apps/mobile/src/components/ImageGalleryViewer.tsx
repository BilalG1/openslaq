import { useCallback, useMemo } from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import ImageViewing from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paths, File as ExpoFile } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";

export interface GalleryImage {
  uri: string;
  filename: string;
}

interface Props {
  images: GalleryImage[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}

function GalleryHeader({
  imageIndex,
  images,
  onClose,
}: {
  imageIndex: number;
  images: GalleryImage[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const image = images[imageIndex];

  return (
    <View
      style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}
      testID="gallery-header"
    >
      <View style={staticStyles.headerRow}>
        <View style={staticStyles.headerTitleContainer}>
          <Text
            style={styles.filename}
            numberOfLines={1}
            testID="gallery-filename"
          >
            {image?.filename}
          </Text>
          {images.length > 1 && (
            <Text
              style={styles.imageCount}
              testID="gallery-count"
            >
              {imageIndex + 1} of {images.length}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          testID="gallery-close"
          accessibilityRole="button"
          accessibilityLabel="Close gallery"
          accessibilityHint="Closes the image viewer"
        >
          <X size={28} color={theme.colors.galleryOverlayText} />
        </Pressable>
      </View>
    </View>
  );
}

function GalleryFooter({
  imageIndex,
  images,
}: {
  imageIndex: number;
  images: GalleryImage[];
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const image = images[imageIndex];

  const downloadToCache = useCallback(async () => {
    if (!image) return null;
    const dest = new ExpoFile(Paths.cache, image.filename);
    const downloaded = await ExpoFile.downloadFileAsync(image.uri, dest);
    return downloaded.uri;
  }, [image]);

  const handleShare = useCallback(async () => {
    try {
      const uri = await downloadToCache();
      if (!uri) return;
      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Error", "Failed to download file for sharing.");
    }
  }, [downloadToCache]);

  const handleSave = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access to save images.");
      return;
    }
    try {
      const uri = await downloadToCache();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "Image saved to your photo library.");
    } catch {
      Alert.alert("Error", "Failed to save image.");
    }
  }, [downloadToCache]);

  return (
    <View
      style={[styles.footerContainer, { paddingBottom: insets.bottom + 12 }]}
      testID="gallery-footer"
    >
      <Pressable
        onPress={handleShare}
        hitSlop={8}
        testID="gallery-share"
        accessibilityRole="button"
        accessibilityLabel="Share image"
        accessibilityHint="Opens the share dialog for this image"
      >
        <Text style={styles.footerActionText}>Share</Text>
      </Pressable>
      <Pressable
        onPress={handleSave}
        hitSlop={8}
        testID="gallery-save"
        accessibilityRole="button"
        accessibilityLabel="Save image"
        accessibilityHint="Saves this image to your photo library"
      >
        <Text style={styles.footerActionText}>Save</Text>
      </Pressable>
    </View>
  );
}

export function ImageGalleryViewer({ images, visible, initialIndex, onClose }: Props) {
  const imageUris = images.map((img) => ({ uri: img.uri }));

  return (
    <ImageViewing
      images={imageUris}
      imageIndex={initialIndex}
      visible={visible}
      onRequestClose={onClose}
      HeaderComponent={({ imageIndex }) => (
        <GalleryHeader imageIndex={imageIndex} images={images} onClose={onClose} />
      )}
      FooterComponent={({ imageIndex }) => (
        <GalleryFooter imageIndex={imageIndex} images={images} />
      )}
    />
  );
}

const staticStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    filename: {
      color: theme.colors.galleryOverlayText,
      fontSize: 16,
      fontWeight: "600",
    },
    imageCount: {
      color: theme.colors.galleryOverlayTextSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      flexDirection: "row",
      justifyContent: "center",
      gap: 32,
    },
    footerActionText: {
      color: theme.colors.galleryOverlayText,
      fontSize: 15,
    },
  });
