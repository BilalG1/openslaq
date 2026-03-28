import { View, Text, SectionList, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { fetchUserThreads } from "@openslaq/client-core";
import type { UserThreadItem } from "@openslaq/client-core";
import { useOperationDeps } from "@/hooks/useOperationDeps";
import { useFetchData } from "@/hooks/useFetchData";
import { MessageSquare } from "lucide-react-native";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/time";

interface Section {
  title: string;
  isNew?: boolean;
  data: UserThreadItem[];
}

function buildSections(threads: UserThreadItem[]): Section[] {
  const newThreads = threads.filter((t) => t.message.replyCount > 0 && t.message.latestReplyAt);
  // For now, without per-thread read positions, treat all threads as general.
  // Group by channel name.
  const channelMap = new Map<string, UserThreadItem[]>();
  for (const t of newThreads) {
    const existing = channelMap.get(t.channelName) ?? [];
    existing.push(t);
    channelMap.set(t.channelName, existing);
  }

  const sections: Section[] = [];
  for (const [channel, items] of channelMap) {
    sections.push({ title: `#${channel}`, data: items });
  }

  return sections;
}

export function ThreadsScreen() {
  const { theme } = useMobileTheme();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const deps = useOperationDeps();
  const router = useRouter();

  const { data: threads, loading, error, refetch: loadThreads } = useFetchData<UserThreadItem[]>({
    fetchFn: () => fetchUserThreads(deps, { workspaceSlug: workspaceSlug! }),
    deps: [workspaceSlug, deps],
    enabled: !!workspaceSlug,
    initialValue: [],
  });

  const sections = buildSections(threads);

  const renderItem = ({ item }: { item: UserThreadItem }) => {
    const msg = item.message;
    const timestamp = msg.latestReplyAt ?? msg.createdAt;

    return (
      <Pressable
        testID={`thread-item-${msg.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Thread by ${msg.senderDisplayName ?? "Unknown"}`}
        accessibilityHint="Opens this thread"
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
        })}
        onPress={() => {
          // Navigate to the channel with the thread open
          router.push(routes.thread(workspaceSlug!, msg.id));
        }}
      >
        <View style={styles.threadHeader}>
          <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>
            {msg.senderDisplayName ?? "Unknown"}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textFaint }]}>
            {formatRelativeTime(timestamp)}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={[styles.contentPreview, { color: theme.colors.textPrimary }]}
        >
          {msg.content}
        </Text>

        <View style={styles.replyInfo}>
          <MessageSquare size={12} color={theme.colors.textFaint} />
          <Text style={[styles.replyCount, { color: theme.colors.textMuted }]}>
            {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View
      style={[styles.sectionHeader, {
        backgroundColor: theme.colors.surfaceSecondary,
        borderBottomColor: theme.colors.borderSecondary,
        borderTopColor: theme.colors.borderSecondary,
      }]}
    >
      <Text
        style={[styles.sectionTitle, {
          color: section.isNew ? theme.brand.primary : theme.colors.textSecondary,
        }]}
      >
        {section.title}
      </Text>
    </View>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: theme.colors.borderSecondary }]} />
  );

  if (loading) {
    return <LoadingScreen testID="threads-screen" />;
  }

  if (error) {
    return (
      <View testID="threads-screen" style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.errorText, { color: theme.colors.textFaint }]}>{error}</Text>
        <Pressable testID="threads-retry" onPress={() => void loadThreads()} accessibilityRole="button" accessibilityLabel="Retry" accessibilityHint="Retries loading threads">
          <Text style={[styles.retryText, { color: theme.brand.primary }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="threads-screen" style={[styles.flex1, { backgroundColor: theme.colors.surface }]}>
      <SectionList
        testID="threads-list"
        sections={sections}
        keyExtractor={(item) => item.message.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderSeparator}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <EmptyState
            testID="threads-empty"
            icon={<MessageSquare size={32} color={theme.colors.textFaint} />}
            message="No threads yet"
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
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  senderName: {
    fontSize: 13,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
  },
  contentPreview: {
    fontSize: 14,
    marginBottom: 4,
  },
  replyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyCount: {
    fontSize: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    marginLeft: 16,
  },
});
