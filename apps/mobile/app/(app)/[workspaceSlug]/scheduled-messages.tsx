import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  fetchScheduledMessages,
  deleteScheduledMessageOp,
  updateScheduledMessageOp,
  type ScheduledMessageItem,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { ScheduleMessageSheet } from "@/components/ScheduleMessageSheet";

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
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [items, setItems] = useState<ScheduledMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleItem, setRescheduleItem] = useState<ScheduledMessageItem | null>(null);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void fetchScheduledMessages(deps, { workspaceSlug })
      .then((result) => {
        if (cancelled) return;
        setItems(result);
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
  }, [workspaceSlug, authProvider, dispatch]);

  const handleDelete = useCallback(
    (item: ScheduledMessageItem) => {
      Alert.alert("Delete Scheduled Message", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!workspaceSlug) return;
            const deps = { api, auth: authProvider, dispatch, getState: () => state };
            await deleteScheduledMessageOp(deps, { workspaceSlug, id: item.id });
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          },
        },
      ]);
    },
    [authProvider, dispatch, state, workspaceSlug],
  );

  const handleReschedule = useCallback(
    async (scheduledFor: Date) => {
      if (!rescheduleItem || !workspaceSlug) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
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
    [authProvider, dispatch, rescheduleItem, state, workspaceSlug],
  );

  const handleNavigateToChannel = useCallback(
    (channelId: string) => {
      router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/${channelId}`);
    },
    [router, workspaceSlug],
  );

  if (loading) {
    return (
      <View
        testID="scheduled-messages-loading"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
      >
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
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
              <Text style={{ fontSize: 13, color: theme.brand.primary }}>View message →</Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View testID="scheduled-messages-empty" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🕐</Text>
            <Text style={{ fontSize: 16, color: theme.colors.textFaint }}>No scheduled messages</Text>
          </View>
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
