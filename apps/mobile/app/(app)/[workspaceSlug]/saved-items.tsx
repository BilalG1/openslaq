import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  fetchSavedMessages,
  unsaveMessageOp,
  type SavedMessageItem,
} from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useFetchData } from "@/hooks/useFetchData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";

export default function SavedItemsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const deps = useOperationDeps();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const { data: items, setData: setItems, loading } = useFetchData<SavedMessageItem[]>({
    fetchFn: () => fetchSavedMessages(deps, { workspaceSlug }),
    deps: [workspaceSlug, deps],
    enabled: !!workspaceSlug,
    initialValue: [],
  });

  const handleRemove = useCallback(
    async (item: SavedMessageItem) => {
      if (!workspaceSlug) return;
      await unsaveMessageOp(deps, {
        workspaceSlug,
        channelId: item.message.channelId,
        messageId: item.message.id,
      });
      setItems((prev) => prev.filter((i) => i.message.id !== item.message.id));
    },
    [deps, workspaceSlug],
  );

  const handleNavigate = useCallback(
    (item: SavedMessageItem) => {
      router.push(routes.channel(workspaceSlug, item.message.channelId));
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return <LoadingScreen testID="saved-items-loading" />;
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
          <EmptyState testID="saved-items-empty" message="No saved messages" />
        }
      />
    </View>
  );
}
