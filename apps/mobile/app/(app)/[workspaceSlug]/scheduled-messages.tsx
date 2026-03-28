import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { confirmDelete } from "../../../src/lib/confirm";
import type { MobileTheme } from "@openslaq/shared";
import {
  fetchScheduledMessages,
  deleteScheduledMessageOp,
  updateScheduledMessageOp,
  type ScheduledMessageItem,
} from "@openslaq/client-core";
import { Clock, ArrowRight } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { useFetchData } from "@/hooks/useFetchData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScheduleMessageSheet } from "@/components/ScheduleMessageSheet";
import { routes } from "@/lib/routes";

function statusColor(status: string, theme: MobileTheme) {
  switch (status) {
    case "pending":
      return theme.brand.primary;
    case "sent":
      return theme.brand.success;
    case "failed":
      return theme.brand.danger;
    default:
      return theme.colors.textMuted;
  }
}

export default function ScheduledMessagesScreen() {
  const { workspaceSlug } = useWorkspaceParams();
  const deps = useOperationDeps();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  const { data: items, setData: setItems, loading, error, refetch } = useFetchData<ScheduledMessageItem[]>({
    fetchFn: () => fetchScheduledMessages(deps, { workspaceSlug: workspaceSlug! }),
    deps: [workspaceSlug, deps],
    enabled: !!workspaceSlug,
    initialValue: [],
  });
  const [rescheduleItem, setRescheduleItem] = useState<ScheduledMessageItem | null>(null);

  const handleDelete = useCallback(
    (item: ScheduledMessageItem) => {
      confirmDelete("Delete Scheduled Message", async () => {
        if (!workspaceSlug) return;
        await deleteScheduledMessageOp(deps, { workspaceSlug, id: item.id });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      });
    },
    [deps, workspaceSlug],
  );

  const handleReschedule = useCallback(
    async (scheduledFor: Date) => {
      if (!rescheduleItem || !workspaceSlug) return;
        const updated = await updateScheduledMessageOp(deps, {
        workspaceSlug,
        id: rescheduleItem.id,
        scheduledFor: scheduledFor.toISOString(),
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === rescheduleItem.id
            ? { ...i, scheduledFor: updated.scheduledFor }
            : i,
        ),
      );
      setRescheduleItem(null);
    },
    [deps, rescheduleItem, workspaceSlug],
  );

  const handleNavigateToChannel = useCallback(
    (channelId: string) => {
      router.push(routes.channel(workspaceSlug!, channelId));
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return <LoadingScreen testID="scheduled-messages-loading" />;
  }

  if (error) {
    return (
      <View testID="scheduled-messages-error" style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable testID="scheduled-messages-retry" onPress={() => void refetch()} accessibilityRole="button" accessibilityLabel="Retry" accessibilityHint="Retries loading scheduled messages">
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="scheduled-messages-screen" style={styles.container}>
      <FlatList
        testID="scheduled-messages-list"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            testID={`scheduled-item-${item.id}`}
            onPress={item.status === "sent" ? () => handleNavigateToChannel(item.channelId) : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Scheduled message to ${item.channelName}, status ${item.status}`}
            accessibilityHint={item.status === "sent" ? "Opens the channel" : "Shows message details"}
            style={styles.itemRow}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.channelName}>
                #{item.channelName}
              </Text>
              <View
                testID={`scheduled-status-${item.id}`}
                style={[styles.statusBadge, { backgroundColor: statusColor(item.status, theme) + "20" }]}
              >
                <Text style={[styles.statusText, { color: statusColor(item.status, theme) }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.scheduledTime}>
              {new Date(item.scheduledFor).toLocaleString()}
            </Text>
            <Text numberOfLines={2} style={styles.content}>
              {item.content}
            </Text>
            {item.status === "failed" && item.failureReason && (
              <Text style={styles.failureReason}>
                {item.failureReason}
              </Text>
            )}
            {item.status === "pending" && (
              <View style={styles.actionRow}>
                <Pressable
                  testID={`scheduled-reschedule-${item.id}`}
                  onPress={() => setRescheduleItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Reschedule"
                  accessibilityHint="Changes the scheduled time"
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 4,
                    backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  })}
                >
                  <Text style={styles.rescheduleText}>Reschedule</Text>
                </Pressable>
                <Pressable
                  testID={`scheduled-delete-${item.id}`}
                  onPress={() => handleDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                  accessibilityHint="Deletes this scheduled message"
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 4,
                    backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  })}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            )}
            {item.status === "sent" && (
              <View style={styles.viewMessageRow}>
                <Text style={styles.viewMessageText}>View message</Text>
                <ArrowRight size={12} color={theme.brand.primary} />
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            testID="scheduled-messages-empty"
            icon={<Clock size={32} color={theme.colors.textFaint} />}
            message="No scheduled messages"
          />
        }
      />
      <ScheduleMessageSheet
        visible={rescheduleItem != null}
        onSchedule={handleReschedule}
        onClose={() => setRescheduleItem(null)}
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
    itemRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    channelName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.brand.primary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
    },
    scheduledTime: {
      fontSize: 12,
      color: theme.colors.textFaint,
      marginBottom: 4,
    },
    content: {
      fontSize: 15,
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    failureReason: {
      fontSize: 12,
      color: theme.brand.danger,
      marginBottom: 8,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
    },
    rescheduleText: {
      fontSize: 13,
      color: theme.brand.primary,
    },
    deleteText: {
      fontSize: 13,
      color: theme.brand.danger,
    },
    viewMessageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    viewMessageText: {
      fontSize: 13,
      color: theme.brand.primary,
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
