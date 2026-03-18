import { useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { X, FileText } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useFetchData } from "@/hooks/useFetchData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";
import { getAllDrafts, removeDraft } from "@/lib/draft-storage";

interface DraftItem {
  draftKey: string;
  text: string;
  channelName: string;
  isThread: boolean;
}

export default function DraftsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const { data: drafts, setData: setDrafts, loading, error } = useFetchData<DraftItem[]>({
    fetchFn: async () => {
      const raw = await getAllDrafts();
      return raw.map(({ draftKey, text }) => {
        const isThread = draftKey.startsWith("thread-");
        let channelName = draftKey;

        if (isThread) {
          channelName = "Thread";
        } else {
          const ch = state.channels.find((c) => c.id === draftKey);
          if (ch) {
            channelName = `#${ch.name}`;
          } else {
            const dm = state.dms.find((d) => d.channel.id === draftKey);
            if (dm) {
              channelName = dm.otherUser.displayName ?? "DM";
            } else {
              const groupDm = state.groupDms.find((g) => g.channel.id === draftKey);
              if (groupDm) {
                channelName = groupDm.channel.displayName ?? groupDm.members.map((m) => m.displayName).join(", ");
              }
            }
          }
        }

        return { draftKey, text, channelName, isThread };
      });
    },
    deps: [],
    initialValue: [],
  });

  const handlePress = useCallback(
    (item: DraftItem) => {
      if (item.isThread) {
        const parentMessageId = item.draftKey.replace("thread-", "");
        router.push(routes.thread(workspaceSlug, parentMessageId));
      } else {
        // Check if it's a DM/group DM or channel
        const isDm = state.dms.some((d) => d.channel.id === item.draftKey);
        const isGroupDm = state.groupDms.some((g) => g.channel.id === item.draftKey);
        if (isDm || isGroupDm) {
          router.push(routes.dm(workspaceSlug, item.draftKey));
        } else {
          router.push(routes.channel(workspaceSlug, item.draftKey));
        }
      }
    },
    [router, state.dms, state.groupDms, workspaceSlug],
  );

  const handleDelete = useCallback((draftKey: string) => {
    void removeDraft(draftKey);
    setDrafts((prev) => prev.filter((d) => d.draftKey !== draftKey));
  }, []);

  if (error) {
    return (
      <View
        testID="drafts-error"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
      >
        <Text style={{ color: theme.colors.dangerText }}>{error}</Text>
      </View>
    );
  }

  if (loading) {
    return <LoadingScreen testID="drafts-loading" />;
  }

  return (
    <View testID="drafts-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <FlatList
        testID="drafts-list"
        data={drafts}
        keyExtractor={(item) => item.draftKey}
        renderItem={({ item }) => (
          <Pressable
            testID={`draft-item-${item.draftKey}`}
            onPress={() => handlePress(item)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.brand.primary, marginBottom: 4 }}>
                {item.channelName}
              </Text>
              <Text
                numberOfLines={2}
                style={{ fontSize: 15, color: theme.colors.textSecondary }}
              >
                {item.text}
              </Text>
            </View>
            <Pressable
              testID={`draft-delete-${item.draftKey}`}
              onPress={() => handleDelete(item.draftKey)}
              hitSlop={8}
              style={{ marginLeft: 12, padding: 4 }}
            >
              <X size={18} color={theme.colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            testID="drafts-empty"
            icon={<FileText size={32} color={theme.colors.textFaint} />}
            message="No drafts"
          />
        }
      />
    </View>
  );
}
