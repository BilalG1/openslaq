import { useCallback, useState } from "react";
import {
  Alert,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
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
import type { ChannelId } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useWorkspaceSlug } from "@/contexts/WorkspaceBootstrapProvider";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useFetchData } from "@/hooks/useFetchData";
import { ScheduleMessageSheet } from "@/components/ScheduleMessageSheet";
import { Send, Clock, FileEdit, ArrowRight } from "lucide-react-native";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/time";

import { TRANSPARENT } from "@/theme/constants";

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
  const workspaceSlug = useWorkspaceSlug();
  const deps = useOperationDeps();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("drafts");
  const [rescheduleItem, setRescheduleItem] = useState<ScheduledMessageItem | null>(null);

  const { data, setData, loading, error, refetch } = useFetchData({
    fetchFn: async () => {
      const [draftsResult, scheduledResult] = await Promise.all([
        fetchDrafts(deps, { workspaceSlug: workspaceSlug! }),
        fetchScheduledMessages(deps, { workspaceSlug: workspaceSlug! }),
      ]);
      return { drafts: draftsResult, scheduled: scheduledResult };
    },
    deps: [workspaceSlug, deps],
    enabled: !!workspaceSlug,
    initialValue: { drafts: [] as DraftItem[], scheduled: [] as ScheduledMessageItem[] },
  });

  const { drafts, scheduled: scheduledItems } = data;

  const pendingAndFailed = scheduledItems.filter((i) => i.status === "pending" || i.status === "failed");
  const sentItems = scheduledItems.filter((i) => i.status === "sent");

  const handleDeleteDraft = useCallback((item: DraftItem) => {
    confirmDelete("Delete Draft", async () => {
      if (!workspaceSlug) return;
      await deleteDraftOp(deps, { workspaceSlug, id: item.id });
      setData((prev) => ({ ...prev, drafts: prev.drafts.filter((d) => d.id !== item.id) }));
    });
  }, [deps, workspaceSlug, setData]);

  const handleDeleteScheduled = useCallback((item: ScheduledMessageItem) => {
    confirmDelete("Delete Scheduled Message", async () => {
      if (!workspaceSlug) return;
      await deleteScheduledMessageOp(deps, { workspaceSlug, id: item.id });
      setData((prev) => ({ ...prev, scheduled: prev.scheduled.filter((i) => i.id !== item.id) }));
    });
  }, [deps, workspaceSlug, setData]);

  const handleReschedule = useCallback(async (scheduledFor: Date) => {
    if (!rescheduleItem || !workspaceSlug) return;
    try {
      const updated = await updateScheduledMessageOp(deps, {
        workspaceSlug, id: rescheduleItem.id, scheduledFor: scheduledFor.toISOString(),
      });
      setData((prev) => ({ ...prev, scheduled: prev.scheduled.map((i) =>
        i.id === rescheduleItem.id ? { ...i, scheduledFor: updated.scheduledFor, status: "pending" as const } : i,
      ) }));
      setRescheduleItem(null);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to reschedule message");
    }
  }, [deps, rescheduleItem, workspaceSlug, setData]);

  const handleNavigateToChannel = useCallback((channelId: ChannelId) => {
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
      <View testID="outbox-loading" style={[styles.centered, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View testID="outbox-error" style={[styles.centered, styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.errorText, { color: theme.colors.textFaint }]}>{error}</Text>
        <Pressable testID="outbox-retry" onPress={refetch} accessibilityRole="button" accessibilityLabel="Retry" accessibilityHint="Retries loading outbox data">
          <Text style={[styles.retryText, { color: theme.brand.primary }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="outbox-screen" style={[styles.flex1, { backgroundColor: theme.colors.surface }]}>
      {/* Segmented control */}
      <View
        testID="outbox-tabs"
        style={[styles.tabsContainer, { backgroundColor: theme.colors.surfaceSecondary }]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              testID={`outbox-tab-${tab.key}`}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityHint={`Switch to ${tab.label} tab`}
              style={[
                styles.tabButton,
                { backgroundColor: isActive ? theme.colors.surface : TRANSPARENT },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                  { color: isActive ? theme.colors.textPrimary : theme.colors.textMuted },
                ]}
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
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              testID={`draft-item-${item.id}`}
              onPress={() => handleDraftPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`Draft in ${item.channelName}`}
              accessibilityHint="Opens draft for editing"
              style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, shadowColor: theme.colors.textPrimary }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.channelName, { color: theme.brand.primary }]}>
                  #{item.channelName}{item.parentMessageId ? " (thread)" : ""}
                </Text>
                <Text style={[styles.timestamp, { color: theme.colors.textFaint }]}>{formatRelativeTime(item.updatedAt)}</Text>
              </View>
              <Text numberOfLines={3} style={[styles.contentPreview, { color: theme.colors.textPrimary }]}>
                {item.content}
              </Text>
              <View style={styles.actionsRow}>
                <Pressable testID={`draft-delete-${item.id}`} onPress={() => handleDeleteDraft(item)} accessibilityRole="button" accessibilityLabel="Delete draft" accessibilityHint="Deletes this draft">
                  <Text style={[styles.actionText, { color: theme.brand.danger }]}>Delete</Text>
                </Pressable>
                <View style={styles.resumeRow}>
                  <Text style={[styles.actionText, { color: theme.brand.primary }]}>Resume</Text>
                  <ArrowRight size={12} color={theme.brand.primary} />
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View testID="outbox-drafts-empty" style={styles.emptyContainer}>
              <FileEdit size={32} color={theme.colors.textFaint} />
              <Text style={[styles.emptyText, { color: theme.colors.textFaint }]}>No drafts</Text>
            </View>
          }
        />
      )}

      {activeTab === "scheduled" && (
        <FlatList
          testID="outbox-scheduled-list"
          data={pendingAndFailed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              testID={`scheduled-item-${item.id}`}
              style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, shadowColor: theme.colors.textPrimary }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.channelName, { color: theme.brand.primary }]}>#{item.channelName}</Text>
                <View testID={`scheduled-status-${item.id}`} style={styles.statusBadge}>
                  <View style={[styles.statusBadgeBg, { backgroundColor: statusColor(item.status, theme) }]} />
                  <Text style={[styles.statusBadgeText, { color: statusColor(item.status, theme) }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.scheduledDate, { color: theme.colors.textFaint }]}>
                {new Date(item.scheduledFor).toLocaleString()}
              </Text>
              <Text numberOfLines={3} style={[styles.contentPreview, { color: theme.colors.textPrimary }]}>
                {item.content}
              </Text>
              {item.status === "failed" && item.failureReason && (
                <Text style={[styles.failureReason, { color: theme.brand.danger }]}>{item.failureReason}</Text>
              )}
              <View style={styles.actionsRow}>
                <Pressable testID={`scheduled-reschedule-${item.id}`} onPress={() => setRescheduleItem(item)} accessibilityRole="button" accessibilityLabel={item.status === "failed" ? "Retry" : "Reschedule"} accessibilityHint="Reschedules this message">
                  <Text style={[styles.actionText, { color: theme.brand.primary }]}>
                    {item.status === "failed" ? "Retry" : "Reschedule"}
                  </Text>
                </Pressable>
                <Pressable testID={`scheduled-delete-${item.id}`} onPress={() => handleDeleteScheduled(item)} accessibilityRole="button" accessibilityLabel="Delete scheduled message" accessibilityHint="Deletes this scheduled message">
                  <Text style={[styles.actionText, { color: theme.brand.danger }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View testID="outbox-scheduled-empty" style={styles.emptyContainer}>
              <Clock size={32} color={theme.colors.textFaint} />
              <Text style={[styles.emptyText, { color: theme.colors.textFaint }]}>No scheduled messages</Text>
            </View>
          }
        />
      )}

      {activeTab === "sent" && (
        <FlatList
          testID="outbox-sent-list"
          data={sentItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              testID={`sent-item-${item.id}`}
              onPress={() => handleNavigateToChannel(item.channelId)}
              accessibilityRole="button"
              accessibilityLabel={`Sent message in ${item.channelName}`}
              accessibilityHint="Navigates to the channel"
              style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, shadowColor: theme.colors.textPrimary }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.channelName, { color: theme.brand.primary }]}>#{item.channelName}</Text>
                <Text style={[styles.timestamp, { color: theme.colors.textFaint }]}>{new Date(item.scheduledFor).toLocaleString()}</Text>
              </View>
              <Text numberOfLines={3} style={[styles.sentContentPreview, { color: theme.colors.textPrimary }]}>
                {item.content}
              </Text>
              <View style={styles.resumeRow}>
                <Text style={[styles.actionText, { color: theme.brand.primary }]}>View message</Text>
                <ArrowRight size={12} color={theme.brand.primary} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View testID="outbox-sent-empty" style={styles.emptyContainer}>
              <Send size={32} color={theme.colors.textFaint} />
              <Text style={[styles.emptyText, { color: theme.colors.textFaint }]}>No sent messages</Text>
            </View>
          }
        />
      )}

      <ScheduleMessageSheet visible={rescheduleItem != null} onSchedule={handleReschedule} onClose={() => setRescheduleItem(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
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
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: "600",
  },
  tabTextInactive: {
    fontWeight: "400",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  channelName: {
    fontSize: 13,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
  },
  contentPreview: {
    fontSize: 15,
    marginBottom: 12,
  },
  sentContentPreview: {
    fontSize: 15,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusBadgeBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  scheduledDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  failureReason: {
    fontSize: 12,
    marginBottom: 8,
  },
});
