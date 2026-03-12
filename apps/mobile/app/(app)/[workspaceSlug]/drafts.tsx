import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { getAllDrafts, removeDraft } from "@/lib/draft-storage";
import Svg, { Path } from "react-native-svg";

interface DraftItem {
  draftKey: string;
  text: string;
  channelName: string;
  isThread: boolean;
}

function DraftIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function DraftsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getAllDrafts().then((raw) => {
      if (cancelled) return;
      const items: DraftItem[] = raw.map(({ draftKey, text }) => {
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
      setDrafts(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = useCallback(
    (item: DraftItem) => {
      if (item.isThread) {
        const parentMessageId = item.draftKey.replace("thread-", "");
        router.push(`/(app)/${workspaceSlug}/thread/${parentMessageId}`);
      } else {
        // Check if it's a DM/group DM or channel
        const isDm = state.dms.some((d) => d.channel.id === item.draftKey);
        const isGroupDm = state.groupDms.some((g) => g.channel.id === item.draftKey);
        if (isDm || isGroupDm) {
          router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${item.draftKey}`);
        } else {
          router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/${item.draftKey}`);
        }
      }
    },
    [router, state.dms, state.groupDms, workspaceSlug],
  );

  const handleDelete = useCallback((draftKey: string) => {
    void removeDraft(draftKey);
    setDrafts((prev) => prev.filter((d) => d.draftKey !== draftKey));
  }, []);

  if (loading) {
    return (
      <View
        testID="drafts-loading"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
      >
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
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
              <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>×</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View testID="drafts-empty" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <DraftIcon color={theme.colors.textFaint} />
            <Text style={{ fontSize: 16, color: theme.colors.textFaint, marginTop: 12 }}>No drafts</Text>
          </View>
        }
      />
    </View>
  );
}
