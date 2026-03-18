import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { confirmDelete } from "../../../src/lib/confirm";
import {
  fetchScheduledMessages,
  deleteScheduledMessageOp,
  updateScheduledMessageOp,
  type ScheduledMessageItem,
} from "@openslaq/client-core";
import { Clock, ArrowRight } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useFetchData } from "@/hooks/useFetchData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScheduleMessageSheet } from "@/components/ScheduleMessageSheet";
import { routes } from "@/lib/routes";

function statusColor(status: string, theme: ReturnType<typeof useMobileTheme>["theme"]) {
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
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const deps = useOperationDeps();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const { data: items, setData: setItems, loading } = useFetchData<ScheduledMessageItem[]>({
    fetchFn: () => fetchScheduledMessages(deps, { workspaceSlug }),
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
      router.push(routes.channel(workspaceSlug, channelId));
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return <LoadingScreen testID="scheduled-messages-loading" />;
  }

  return (
    <View testID="scheduled-messages-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <FlatList
        testID="scheduled-messages-list"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            testID={`scheduled-item-${item.id}`}
            onPress={item.status === "sent" ? () => handleNavigateToChannel(item.channelId) : undefined}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.brand.primary }}>
                #{item.channelName}
              </Text>
              <View
                testID={`scheduled-status-${item.id}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: statusColor(item.status, theme) + "20",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: statusColor(item.status, theme) }}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginBottom: 4 }}>
              {new Date(item.scheduledFor).toLocaleString()}
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontSize: 15, color: theme.colors.textPrimary, marginBottom: 8 }}
            >
              {item.content}
            </Text>
            {item.status === "failed" && item.failureReason && (
              <Text style={{ fontSize: 12, color: theme.brand.danger, marginBottom: 8 }}>
                {item.failureReason}
              </Text>
            )}
            {item.status === "pending" && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  testID={`scheduled-reschedule-${item.id}`}
                  onPress={() => setRescheduleItem(item)}
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 4,
                    backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  })}
                >
                  <Text style={{ fontSize: 13, color: theme.brand.primary }}>Reschedule</Text>
                </Pressable>
                <Pressable
                  testID={`scheduled-delete-${item.id}`}
                  onPress={() => handleDelete(item)}
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 4,
                    backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  })}
                >
                  <Text style={{ fontSize: 13, color: theme.brand.danger }}>Delete</Text>
                </Pressable>
              </View>
            )}
            {item.status === "sent" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 13, color: theme.brand.primary }}>View message</Text>
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
