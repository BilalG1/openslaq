import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { confirmDelete } from "../lib/confirm";
import {
  fetchDrafts,
  deleteDraftOp,
  fetchScheduledMessages,
  deleteScheduledMessageOp,
  updateScheduledMessageOp,
  type DraftItem,
  type ScheduledMessageItem,
} from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { ScheduleMessageSheet } from "@/components/ScheduleMessageSheet";
import { Send, Clock, FileEdit, ArrowRight } from "lucide-react-native";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/time";

type TabKey = "drafts" | "scheduled" | "sent";

const TABS: { key: TabKey; label: string }[] = [
  { key: "drafts", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
];

function statusColor(status: string, theme: ReturnType<typeof useMobileTheme>["theme"]) {
  switch (status) {
    case "pending": return theme.brand.primary;
    case "sent": return theme.brand.success;
    case "failed": return theme.brand.danger;
    default: return theme.colors.textMuted;
  }
}

export function OutboxScreen() {
  const { theme } = useMobileTheme();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const deps = useOperationDeps();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("drafts");
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [scheduledItems, setScheduledItems] = useState<ScheduledMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<ScheduledMessageItem | null>(null);


  const loadData = useCallback(async () => {
    if (!workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      const [draftsResult, scheduledResult] = await Promise.all([
        fetchDrafts(deps, { workspaceSlug }),
        fetchScheduledMessages(deps, { workspaceSlug }),
      ]);
      setDrafts(draftsResult);
      setScheduledItems(scheduledResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load outbox");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, deps]);

  useEffect(() => { void loadData(); }, [loadData]);

  const pendingAndFailed = scheduledItems.filter((i) => i.status === "pending" || i.status === "failed");
  const sentItems = scheduledItems.filter((i) => i.status === "sent");

  const handleDeleteDraft = useCallback((item: DraftItem) => {
    confirmDelete("Delete Draft", async () => {
      if (!workspaceSlug) return;
      await deleteDraftOp(deps, { workspaceSlug, id: item.id });
      setDrafts((prev) => prev.filter((d) => d.id !== item.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, workspaceSlug]);

  const handleDeleteScheduled = useCallback((item: ScheduledMessageItem) => {
    confirmDelete("Delete Scheduled Message", async () => {
      if (!workspaceSlug) return;
      await deleteScheduledMessageOp(deps, { workspaceSlug, id: item.id });
      setScheduledItems((prev) => prev.filter((i) => i.id !== item.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, workspaceSlug]);

  const handleReschedule = useCallback(async (scheduledFor: Date) => {
    if (!rescheduleItem || !workspaceSlug) return;
    const updated = await updateScheduledMessageOp(deps, {
      workspaceSlug, id: rescheduleItem.id, scheduledFor: scheduledFor.toISOString(),
    });
    setScheduledItems((prev) => prev.map((i) =>
      i.id === rescheduleItem.id ? { ...i, scheduledFor: updated.scheduledFor, status: "pending" as const } : i,
    ));
    setRescheduleItem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, rescheduleItem, workspaceSlug]);

  const handleNavigateToChannel = useCallback((channelId: string) => {
    router.push(routes.channel(workspaceSlug!, channelId));
  }, [router, workspaceSlug]);

  const handleDraftPress = useCallback((item: DraftItem) => {
    if (item.parentMessageId) {
      router.push(routes.thread(workspaceSlug!, item.parentMessageId));
    } else {
      router.push(routes.channel(workspaceSlug!, item.channelId));
    }
  }, [router, workspaceSlug]);

  if (loading) {
    return (
      <View testID="outbox-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View testID="outbox-error" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, padding: 24 }}>
        <Text style={{ fontSize: 14, color: theme.colors.textFaint, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable testID="outbox-retry" onPress={() => void loadData()}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.brand.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="outbox-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Segmented control */}
      <View
        testID="outbox-tabs"
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: 8,
          padding: 2,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              testID={`outbox-tab-${tab.key}`}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                alignItems: "center",
                backgroundColor: isActive ? theme.colors.surface : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? theme.colors.textPrimary : theme.colors.textMuted,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "drafts" && (
        <FlatList
          testID="outbox-drafts-list"
          data={drafts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`draft-item-${item.id}`}
              onPress={() => handleDraftPress(item)}
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.brand.primary }}>
                  #{item.channelName}{item.parentMessageId ? " (thread)" : ""}
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.textFaint }}>{formatRelativeTime(item.updatedAt)}</Text>
              </View>
              <Text numberOfLines={3} style={{ fontSize: 15, color: theme.colors.textPrimary, marginBottom: 12 }}>
                {item.content}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable testID={`draft-delete-${item.id}`} onPress={() => handleDeleteDraft(item)}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: theme.brand.danger }}>Delete</Text>
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: theme.brand.primary }}>Resume</Text>
                  <ArrowRight size={12} color={theme.brand.primary} />
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View testID="outbox-drafts-empty" style={{ alignItems: "center", paddingVertical: 48 }}>
              <FileEdit size={32} color={theme.colors.textFaint} />
              <Text style={{ fontSize: 16, color: theme.colors.textFaint, marginTop: 12 }}>No drafts</Text>
            </View>
          }
        />
      )}

      {activeTab === "scheduled" && (
        <FlatList
          testID="outbox-scheduled-list"
          data={pendingAndFailed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View
              testID={`scheduled-item-${item.id}`}
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.brand.primary }}>#{item.channelName}</Text>
                <View testID={`scheduled-status-${item.id}`} style={{
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
                  overflow: "hidden",
                }}>
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: statusColor(item.status, theme), opacity: 0.12 }} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor(item.status, theme) }}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginBottom: 4 }}>
                {new Date(item.scheduledFor).toLocaleString()}
              </Text>
              <Text numberOfLines={3} style={{ fontSize: 15, color: theme.colors.textPrimary, marginBottom: 12 }}>
                {item.content}
              </Text>
              {item.status === "failed" && item.failureReason && (
                <Text style={{ fontSize: 12, color: theme.brand.danger, marginBottom: 8 }}>{item.failureReason}</Text>
              )}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable testID={`scheduled-reschedule-${item.id}`} onPress={() => setRescheduleItem(item)}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: theme.brand.primary }}>
                    {item.status === "failed" ? "Retry" : "Reschedule"}
                  </Text>
                </Pressable>
                <Pressable testID={`scheduled-delete-${item.id}`} onPress={() => handleDeleteScheduled(item)}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: theme.brand.danger }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View testID="outbox-scheduled-empty" style={{ alignItems: "center", paddingVertical: 48 }}>
              <Clock size={32} color={theme.colors.textFaint} />
              <Text style={{ fontSize: 16, color: theme.colors.textFaint, marginTop: 12 }}>No scheduled messages</Text>
            </View>
          }
        />
      )}

      {activeTab === "sent" && (
        <FlatList
          testID="outbox-sent-list"
          data={sentItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`sent-item-${item.id}`}
              onPress={() => handleNavigateToChannel(item.channelId)}
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.brand.primary }}>#{item.channelName}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textFaint }}>{new Date(item.scheduledFor).toLocaleString()}</Text>
              </View>
              <Text numberOfLines={3} style={{ fontSize: 15, color: theme.colors.textPrimary, marginBottom: 8 }}>
                {item.content}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: theme.brand.primary }}>View message</Text>
                <ArrowRight size={12} color={theme.brand.primary} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View testID="outbox-sent-empty" style={{ alignItems: "center", paddingVertical: 48 }}>
              <Send size={32} color={theme.colors.textFaint} />
              <Text style={{ fontSize: 16, color: theme.colors.textFaint, marginTop: 12 }}>No sent messages</Text>
            </View>
          }
        />
      )}

      <ScheduleMessageSheet visible={rescheduleItem != null} onSchedule={handleReschedule} onClose={() => setRescheduleItem(null)} />
    </View>
  );
}
