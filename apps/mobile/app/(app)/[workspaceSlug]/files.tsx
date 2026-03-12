import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchFiles } from "@openslaq/client-core";
import type { FileBrowserItem, FileCategory } from "@openslaq/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { openSafeUrl } from "@/utils/url-validation";

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

function getCategoryIcon(category: FileCategory): string {
  switch (category) {
    case "images":
      return "📷";
    case "videos":
      return "🎬";
    case "documents":
      return "📄";
    case "audio":
      return "🎵";
    case "other":
      return "📎";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FilesBrowserScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [files, setFiles] = useState<FileBrowserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<FileCategory | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileBrowserItem | null>(null);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, authProvider, dispatch, category]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore || !workspaceSlug) return;
    setLoadingMore(true);
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void fetchFiles(deps, { workspaceSlug, category, cursor: nextCursor })
      .then((result) => {
        setFiles((prev) => [...prev, ...result.files]);
        setNextCursor(result.nextCursor);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, workspaceSlug, authProvider, dispatch, state, category]);

  const handleFilePress = useCallback((file: FileBrowserItem) => {
    if (file.category === "images") {
      setPreviewFile(file);
    } else {
      openSafeUrl(getDownloadUrl(String(file.id)));
    }
  }, []);

  const handleJumpToChannel = useCallback(
    (channelId: string) => {
      router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/${channelId}`);
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return (
      <View
        testID="files-loading"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
      >
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View testID="files-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
        {CATEGORIES.map((cat) => {
          const active = cat.value === category;
          return (
            <Pressable
              key={cat.label}
              testID={`filter-chip-${cat.label.toLowerCase()}`}
              onPress={() => setCategory(cat.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: active ? theme.brand.primary : theme.colors.surfaceSecondary,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : theme.colors.textPrimary }}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* File list */}
      <FlatList
        testID="files-list"
        data={files}
        keyExtractor={(item) => String(item.id)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Pressable
            testID={`file-row-${item.id}`}
            onPress={() => handleFilePress(item)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
            }}
          >
            {/* Thumbnail / icon */}
            {item.category === "images" ? (
              <Image
                source={{ uri: getDownloadUrl(String(item.id)) }}
                style={{ width: 48, height: 48, borderRadius: 6, marginRight: 12 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  marginRight: 12,
                  backgroundColor: theme.colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>{getCategoryIcon(item.category)}</Text>
              </View>
            )}

            {/* Center info */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary }}
              >
                {item.filename}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}
              >
                {formatSize(item.size)} · {item.uploaderName} · #{item.channelName} · {formatDate(item.createdAt)}
              </Text>
            </View>

            {/* Jump to channel chevron */}
            <Pressable
              testID={`file-jump-${item.id}`}
              onPress={() => handleJumpToChannel(String(item.channelId))}
              hitSlop={8}
            >
              <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>→</Text>
            </Pressable>
          </Pressable>
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={theme.brand.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View testID="files-empty" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>📁</Text>
            <Text style={{ fontSize: 16, color: theme.colors.textFaint }}>No files found</Text>
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
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setPreviewFile(null)}
        >
          {previewFile && (
            <>
              <Image
                source={{ uri: getDownloadUrl(String(previewFile.id)) }}
                style={{ width: "90%", height: "70%" }}
                resizeMode="contain"
              />
              <Text style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>
                {previewFile.filename}
              </Text>
            </>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
