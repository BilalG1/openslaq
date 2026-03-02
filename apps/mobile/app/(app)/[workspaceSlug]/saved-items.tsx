import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  fetchSavedMessages,
  unsaveMessageOp,
  type SavedMessageItem,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";

export default function SavedItemsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [items, setItems] = useState<SavedMessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void fetchSavedMessages(deps, { workspaceSlug }).then((result) => {
      if (cancelled) return;
      setItems(result);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, authProvider, dispatch]);

  const handleRemove = useCallback(
    async (item: SavedMessageItem) => {
      if (!workspaceSlug) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await unsaveMessageOp(deps, {
        workspaceSlug,
        channelId: item.message.channelId,
        messageId: item.message.id,
      });
      setItems((prev) => prev.filter((i) => i.message.id !== item.message.id));
    },
    [authProvider, dispatch, state, workspaceSlug],
  );

  const handleNavigate = useCallback(
    (item: SavedMessageItem) => {
      router.push(`/(app)/${workspaceSlug}/(channels)/${item.message.channelId}`);
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return (
      <View
        testID="saved-items-loading"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
      >
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View testID="saved-items-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <FlatList
        testID="saved-items-list"
        data={items}
        keyExtractor={(item) => item.message.id}
        renderItem={({ item }) => (
          <Pressable
            testID={`saved-item-${item.message.id}`}
            onPress={() => handleNavigate(item)}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
              backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
            })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.brand.primary }}>
                #{item.channelName}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textFaint }}>
                {new Date(item.savedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
              {item.message.senderDisplayName}
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontSize: 15, color: theme.colors.textPrimary, marginBottom: 8 }}
            >
              {item.message.content}
            </Text>
            <Pressable
              testID={`saved-item-remove-${item.message.id}`}
              onPress={() => void handleRemove(item)}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 4,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
              })}
            >
              <Text style={{ fontSize: 13, color: theme.brand.danger }}>Remove</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View testID="saved-items-empty" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ fontSize: 16, color: theme.colors.textFaint }}>No saved messages</Text>
          </View>
        }
      />
    </View>
  );
}
