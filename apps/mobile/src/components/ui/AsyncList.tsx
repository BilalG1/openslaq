import type { ReactElement, ReactNode } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import type { ListRenderItem } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { LoadingScreen } from "./LoadingScreen";
import { EmptyState } from "./EmptyState";

interface AsyncListProps<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  emptyMessage: string;
  emptyIcon?: ReactNode;
  testID?: string;
  loadingTestID?: string;
  errorTestID?: string;
  emptyTestID?: string;
  listTestID?: string;
  ListHeaderComponent?: ReactElement | null;
  ItemSeparatorComponent?: React.ComponentType | null;
  contentContainerStyle?: object;
}

export function AsyncList<T>({
  data,
  loading,
  error,
  onRetry,
  keyExtractor,
  renderItem,
  emptyMessage,
  emptyIcon,
  testID,
  loadingTestID,
  errorTestID,
  emptyTestID,
  listTestID,
  ListHeaderComponent,
  ItemSeparatorComponent,
  contentContainerStyle,
}: AsyncListProps<T>) {
  const { theme } = useMobileTheme();

  if (loading) {
    return <LoadingScreen testID={loadingTestID ?? testID} />;
  }

  if (error) {
    return (
      <View testID={errorTestID ?? testID} style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.errorText, { color: theme.colors.textFaint }]}>{error}</Text>
        {onRetry && (
          <Pressable testID={errorTestID ? `${errorTestID}-retry` : undefined} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry" accessibilityHint="Retries loading data">
            <Text style={[styles.retryText, { color: theme.brand.primary }]}>Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View testID={testID} style={[styles.flex1, { backgroundColor: theme.colors.surface }]}>
      <FlatList
        testID={listTestID}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={contentContainerStyle}
        ListEmptyComponent={
          <EmptyState
            testID={emptyTestID}
            icon={emptyIcon}
            message={emptyMessage}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
