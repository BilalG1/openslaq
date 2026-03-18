import { useCallback } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { X } from "lucide-react-native";
import ImageViewing from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paths, File as ExpoFile } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

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
  const image = images[imageIndex];

  return (
    <View
      style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12 }}
      testID="gallery-header"
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
            numberOfLines={1}
            testID="gallery-filename"
          >
            {image?.filename}
          </Text>
          {images.length > 1 && (
            <Text
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 }}
              testID="gallery-count"
            >
              {imageIndex + 1} of {images.length}
            </Text>
          )}
        </View>
        <Pressable onPress={onClose} hitSlop={12} testID="gallery-close">
          <X size={28} color="#fff" />
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
      style={{
        paddingBottom: insets.bottom + 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        flexDirection: "row",
        justifyContent: "center",
        gap: 32,
      }}
      testID="gallery-footer"
    >
      <Pressable onPress={handleShare} hitSlop={8} testID="gallery-share">
        <Text style={{ color: "#fff", fontSize: 15 }}>Share</Text>
      </Pressable>
      <Pressable onPress={handleSave} hitSlop={8} testID="gallery-save">
        <Text style={{ color: "#fff", fontSize: 15 }}>Save</Text>
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
