import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import type { Attachment } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { env } from "@/lib/env";
import { openSafeUrl } from "@/utils/url-validation";
import { AudioPlayer } from "./AudioPlayer";
import { ImageGalleryViewer } from "./ImageGalleryViewer";

interface Props {
  attachments: Attachment[];
}

function getDownloadUrl(id: string): string {
  return `${env.EXPO_PUBLIC_API_URL}/api/uploads/${id}/download`;
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
  const url = getDownloadUrl(attachment.id);

  return (
    <Pressable
      testID={`attachment-image-${attachment.id}`}
      onPress={onPress}
    >
      <Image
        source={{ uri: url }}
        style={{
          maxWidth: 240,
          height: 160,
          borderRadius: 8,
        }}
        resizeMode="cover"
      />
    </Pressable>
  );
}

function VideoAttachment({ attachment }: { attachment: Attachment }) {
  const { theme } = useMobileTheme();
  const url = getDownloadUrl(attachment.id);

  return (
    <Pressable
      testID={`attachment-video-${attachment.id}`}
      onPress={() => openSafeUrl(url)}
      style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surfaceTertiary }}
    >
      <Text style={{ marginRight: 8 }}>🎬</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, color: theme.brand.primary }}
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
          {formatSize(attachment.size)}
        </Text>
      </View>
    </Pressable>
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  const { theme } = useMobileTheme();
  const url = getDownloadUrl(attachment.id);

  return (
    <Pressable
      testID={`attachment-file-${attachment.id}`}
      onPress={() => openSafeUrl(url)}
      style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surfaceTertiary }}
    >
      <Text style={{ marginRight: 8 }}>📎</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, color: theme.brand.primary }}
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
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
    uri: getDownloadUrl(a.id),
    filename: a.filename,
  }));

  let imageIndex = 0;

  return (
    <View testID="message-attachments" style={{ marginTop: 4, gap: 6 }}>
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
          return <AudioPlayer key={att.id} uri={getDownloadUrl(att.id)} filename={att.filename} />;
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
