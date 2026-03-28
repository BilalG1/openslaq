import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import type { MobileTheme } from "@openslaq/shared";
import {
  fetchSavedMessages,
  unsaveMessageOp,
  type SavedMessageItem,
} from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { useFetchData } from "@/hooks/useFetchData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";

export default function SavedItemsScreen() {
  const { workspaceSlug } = useWorkspaceParams();
  const deps = useOperationDeps();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  const { data: items, setData: setItems, loading, error, refetch } = useFetchData<SavedMessageItem[]>({
    fetchFn: () => fetchSavedMessages(deps, { workspaceSlug: workspaceSlug! }),
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
      router.push(routes.channel(workspaceSlug!, item.message.channelId));
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return <LoadingScreen testID="saved-items-loading" />;
  }

  if (error) {
    return (
      <View testID="saved-items-error" style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable testID="saved-items-retry" onPress={() => void refetch()} accessibilityRole="button" accessibilityLabel="Retry" accessibilityHint="Retries loading saved items">
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="saved-items-screen" style={styles.container}>
      <FlatList
        testID="saved-items-list"
        data={items}
        keyExtractor={(item) => item.message.id}
        renderItem={({ item }) => (
          <Pressable
            testID={`saved-item-${item.message.id}`}
            onPress={() => handleNavigate(item)}
            accessibilityRole="button"
            accessibilityLabel={`Saved message from ${item.message.senderDisplayName}`}
            accessibilityHint="Opens the message in its channel"
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
              backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
            })}
          >
            <View style={styles.headerRow}>
              <Text style={styles.channelName}>
                #{item.channelName}
              </Text>
              <Text style={styles.savedDate}>
                {new Date(item.savedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.senderName}>
              {item.message.senderDisplayName}
            </Text>
            <Text numberOfLines={2} style={styles.messageContent}>
              {item.message.content}
            </Text>
            <Pressable
              testID={`saved-item-remove-${item.message.id}`}
              onPress={() => void handleRemove(item)}
              accessibilityRole="button"
              accessibilityLabel="Remove saved message"
              accessibilityHint="Removes this message from saved items"
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 4,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
              })}
            >
              <Text style={styles.removeText}>Remove</Text>
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

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    channelName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.brand.primary,
    },
    savedDate: {
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    senderName: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    messageContent: {
      fontSize: 15,
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    removeText: {
      fontSize: 13,
      color: theme.brand.danger,
    },
    errorContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    errorText: {
      fontSize: 14,
      textAlign: "center",
      marginBottom: 16,
      color: theme.colors.textFaint,
    },
    retryText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.brand.primary,
    },
  });
