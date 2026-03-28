import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchFiles } from "@openslaq/client-core";
import type { FileBrowserItem, FileCategory, MobileTheme } from "@openslaq/shared";
import { Camera, Film, FileText, Music, Paperclip, ChevronRight, Folder } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { env } from "@/lib/env";
import { openSafeUrl } from "@/utils/url-validation";
import { routes } from "@/lib/routes";

const CATEGORIES: { label: string; value: FileCategory | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Images", value: "images" },
  { label: "Videos", value: "videos" },
  { label: "Documents", value: "documents" },
  { label: "Audio", value: "audio" },
  { label: "Other", value: "other" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDownloadUrl(id: string): string {
  return `${env.EXPO_PUBLIC_API_URL}/api/uploads/${id}/download`;
}

function getCategoryIcon(category: FileCategory, color: string): React.ReactNode {
  switch (category) {
    case "images":
      return <Camera size={22} color={color} />;
    case "videos":
      return <Film size={22} color={color} />;
    case "documents":
      return <FileText size={22} color={color} />;
    case "audio":
      return <Music size={22} color={color} />;
    case "other":
      return <Paperclip size={22} color={color} />;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FilesBrowserScreen() {
  const { workspaceSlug } = useWorkspaceParams();
  const deps = useOperationDeps();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  const [files, setFiles] = useState<FileBrowserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<FileCategory | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileBrowserItem | null>(null);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    void fetchFiles(deps, { workspaceSlug, category })
      .then((result) => {
        if (cancelled) return;
        setFiles(result.files);
        setNextCursor(result.nextCursor);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
     
  }, [workspaceSlug, deps, category]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore || !workspaceSlug) return;
    setLoadingMore(true);
    void fetchFiles(deps, { workspaceSlug, category, cursor: nextCursor })
      .then((result) => {
        setFiles((prev) => [...prev, ...result.files]);
        setNextCursor(result.nextCursor);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, workspaceSlug, deps, category]);

  const handleFilePress = useCallback((file: FileBrowserItem) => {
    if (file.category === "images") {
      setPreviewFile(file);
    } else {
      openSafeUrl(getDownloadUrl(String(file.id)));
    }
  }, []);

  const handleJumpToChannel = useCallback(
    (channelId: string) => {
      router.push(routes.channel(workspaceSlug!, channelId));
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return (
      <View testID="files-loading" style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View testID="files-screen" style={styles.container}>
      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollNoGrow}
        contentContainerStyle={styles.chipScrollContent}
      >
        {CATEGORIES.map((cat) => {
          const active = cat.value === category;
          return (
            <Pressable
              key={cat.label}
              testID={`filter-chip-${cat.label.toLowerCase()}`}
              onPress={() => setCategory(cat.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat.label}`}
              accessibilityHint={`Shows ${cat.label.toLowerCase()} files`}
              style={[
                styles.chip,
                { backgroundColor: active ? theme.brand.primary : theme.colors.surfaceSecondary },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? theme.colors.headerText : theme.colors.textPrimary }]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* File list */}
      <FlatList
        testID="files-list"
        style={styles.flex}
        data={files}
        keyExtractor={(item) => String(item.id)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Pressable
            testID={`file-row-${item.id}`}
            onPress={() => handleFilePress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.filename}
            accessibilityHint="Opens the file"
            style={styles.fileRow}
          >
            {/* Thumbnail / icon */}
            {item.category === "images" ? (
              <Image
                source={{ uri: getDownloadUrl(String(item.id)) }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.iconPlaceholder}>
                {getCategoryIcon(item.category, theme.colors.textMuted)}
              </View>
            )}

            {/* Center info */}
            <View style={styles.fileInfo}>
              <Text numberOfLines={1} style={styles.fileName}>
                {item.filename}
              </Text>
              <Text numberOfLines={1} style={styles.fileMeta}>
                {formatSize(item.size)} · {item.uploaderName} · #{item.channelName} · {formatDate(item.createdAt)}
              </Text>
            </View>

            {/* Jump to channel chevron */}
            <Pressable
              testID={`file-jump-${item.id}`}
              onPress={() => handleJumpToChannel(String(item.channelId))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Jump to channel"
              accessibilityHint="Navigates to the channel where this file was shared"
            >
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerSpinner}>
              <ActivityIndicator size="small" color={theme.brand.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View testID="files-empty" style={styles.emptyContainer}>
            <Folder size={32} color={theme.colors.textFaint} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No files found</Text>
          </View>
        }
      />

      {/* Image preview modal */}
      <Modal
        visible={previewFile != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewFile(null)}
      >
        <Pressable
          testID="file-preview-modal"
          style={styles.previewOverlay}
          onPress={() => setPreviewFile(null)}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
          accessibilityHint="Closes the image preview"
        >
          {previewFile && (
            <>
              <Image
                source={{ uri: getDownloadUrl(String(previewFile.id)) }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <Text style={styles.previewFilename}>
                {previewFile.filename}
              </Text>
            </>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    chipScrollNoGrow: {
      flexGrow: 0,
    },
    chipScrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
    },
    flex: {
      flex: 1,
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    thumbnail: {
      width: 48,
      height: 48,
      borderRadius: 6,
      marginRight: 12,
    },
    iconPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 6,
      marginRight: 12,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    fileInfo: {
      flex: 1,
      marginRight: 8,
    },
    fileName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    fileMeta: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    footerSpinner: {
      paddingVertical: 16,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
    },
    emptyIcon: {
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textFaint,
    },
    previewOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlayHeavy,
      justifyContent: "center",
      alignItems: "center",
    },
    previewImage: {
      width: "90%",
      height: "70%",
    },
    previewFilename: {
      color: theme.colors.headerText,
      marginTop: 12,
      fontSize: 14,
    },
  });
