import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Film, Paperclip } from "lucide-react-native";
import type { Attachment } from "@openslaq/shared";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { openSafeUrl } from "@/utils/url-validation";
import { AudioPlayer } from "./AudioPlayer";
import { ImageGalleryViewer } from "./ImageGalleryViewer";

interface Props {
  attachments: Attachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({
  attachment,
  onPress,
}: {
  attachment: Attachment;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`attachment-image-${attachment.id}`}
      onPress={onPress}
      accessibilityRole="image"
      accessibilityLabel={`Image: ${attachment.filename}`}
      accessibilityHint="Opens the image in full screen"
    >
      <Image
        source={{ uri: attachment.downloadUrl }}
        style={staticStyles.imageAttachment}
        resizeMode="cover"
      />
    </Pressable>
  );
}

function VideoAttachment({ attachment }: { attachment: Attachment }) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      testID={`attachment-video-${attachment.id}`}
      onPress={() => openSafeUrl(attachment.downloadUrl)}
      style={styles.fileRow}
      accessibilityRole="button"
      accessibilityLabel={`Video: ${attachment.filename}`}
      accessibilityHint="Opens the video for playback"
    >
      <Film size={16} color={theme.colors.textMuted} style={staticStyles.fileIcon} />
      <View style={staticStyles.fileContent}>
        <Text
          style={styles.fileName}
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text style={styles.fileSize}>
          {formatSize(attachment.size)}
        </Text>
      </View>
    </Pressable>
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      testID={`attachment-file-${attachment.id}`}
      onPress={() => openSafeUrl(attachment.downloadUrl)}
      style={styles.fileRow}
      accessibilityRole="button"
      accessibilityLabel={`File: ${attachment.filename}`}
      accessibilityHint="Opens the file for download"
    >
      <Paperclip size={16} color={theme.colors.textMuted} style={staticStyles.fileIcon} />
      <View style={staticStyles.fileContent}>
        <Text
          style={styles.fileName}
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text style={styles.fileSize}>
          {formatSize(attachment.size)}
        </Text>
      </View>
    </Pressable>
  );
}

export function MessageAttachments({ attachments }: Props) {
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (attachments.length === 0) return null;

  const imageAttachments = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const galleryImages = imageAttachments.map((a) => ({
    uri: a.downloadUrl,
    filename: a.filename,
  }));

  let imageIndex = 0;

  return (
    <View testID="message-attachments" style={staticStyles.container}>
      {attachments.map((att) => {
        if (att.mimeType.startsWith("image/")) {
          const idx = imageIndex++;
          return (
            <ImageAttachment
              key={att.id}
              attachment={att}
              onPress={() => {
                setGalleryIndex(idx);
                setGalleryVisible(true);
              }}
            />
          );
        }
        if (att.mimeType.startsWith("audio/")) {
          return <AudioPlayer key={att.id} uri={att.downloadUrl} filename={att.filename} />;
        }
        if (att.mimeType.startsWith("video/")) {
          return <VideoAttachment key={att.id} attachment={att} />;
        }
        return <FileAttachment key={att.id} attachment={att} />;
      })}
      {galleryImages.length > 0 && (
        <ImageGalleryViewer
          images={galleryImages}
          visible={galleryVisible}
          initialIndex={galleryIndex}
          onClose={() => setGalleryVisible(false)}
        />
      )}
    </View>
  );
}

const staticStyles = StyleSheet.create({
  container: {
    marginTop: 4,
    gap: 6,
  },
  imageAttachment: {
    width: 240,
    height: 160,
    borderRadius: 8,
  },
  fileIcon: {
    marginRight: 8,
  },
  fileContent: {
    flex: 1,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    fileName: {
      fontSize: 14,
      color: theme.brand.primary,
    },
    fileSize: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });
