import { useCallback, useEffect, useRef } from "react";
import { View, Text, FlatList, Pressable, Animated, Easing } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Headphones, Monitor, Users } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useHuddle } from "@/contexts/HuddleProvider";
import type { HuddleState } from "@openslaq/shared";
import { routes } from "@/lib/routes";

function formatDuration(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min > 0 ? `${hr}h ${min}m` : `${hr}h`;
}

function PulsingDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#22c55e",
        opacity: anim,
      }}
    />
  );
}

interface HuddleCardItem {
  channelId: string;
  channelName: string;
  huddle: HuddleState;
  isCurrent: boolean;
}

export function HuddlesScreen() {
  const { theme } = useMobileTheme();
  const { state } = useChatStore();
  const { joinHuddle } = useHuddle();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  const items: HuddleCardItem[] = Object.values(state.activeHuddles)
    .map((huddle) => {
      const channel = state.channels.find((c) => c.id === huddle.channelId);
      const dm = state.dms.find((d) => d.channel.id === huddle.channelId);
      const channelName = channel ? `# ${channel.name}` : dm?.otherUser.displayName ?? "Huddle";
      return {
        channelId: String(huddle.channelId),
        channelName,
        huddle,
        isCurrent: state.currentHuddleChannelId === huddle.channelId,
      };
    })
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

  const handleJoin = useCallback(
    (channelId: string) => {
      joinHuddle(channelId);
      router.push(routes.huddle(workspaceSlug!));
    },
    [joinHuddle, router, workspaceSlug],
  );

  const renderItem = ({ item }: { item: HuddleCardItem }) => {
    const { huddle, channelName, isCurrent, channelId } = item;
    const participantCount = huddle.participants.length;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 16,
          backgroundColor: theme.colors.surfaceSecondary,
          borderLeftWidth: isCurrent ? 3 : 0,
          borderLeftColor: "#22c55e",
          overflow: "hidden",
        }}
      >
        <Pressable
          testID={`huddle-card-${channelId}`}
          onPress={() => handleJoin(channelId)}
          style={({ pressed }) => ({
            padding: 16,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {/* Channel name + duration */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, flex: 1 }} numberOfLines={1}>
              {channelName}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: isCurrent ? "#22c55e" : "rgba(34,197,94,0.15)",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: isCurrent ? "#fff" : "#22c55e" }}>
                {formatDuration(huddle.startedAt)}
              </Text>
            </View>
          </View>

          {/* Participants row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            {/* Overlapping avatar circles */}
            <View style={{ flexDirection: "row", marginRight: 8 }}>
              {huddle.participants.slice(0, 5).map((p, i) => (
                <View
                  key={String(p.userId)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: ["#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"][i % 5],
                    borderWidth: 2,
                    borderColor: theme.colors.surfaceSecondary,
                    marginLeft: i > 0 ? -8 : 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                    {String(p.userId).charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Users size={13} color={theme.colors.textMuted} />
              <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
                {participantCount} {participantCount === 1 ? "person" : "people"}
              </Text>
            </View>
          </View>

          {/* Screen share indicator + join hint */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {huddle.screenShareUserId ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Monitor size={13} color="#f59e0b" />
                <Text style={{ fontSize: 12, color: "#f59e0b" }}>Screen sharing</Text>
              </View>
            ) : (
              <View />
            )}
            <Text style={{ fontSize: 12, color: theme.colors.textFaint }}>
              {isCurrent ? "Tap to return" : "Tap to join"}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View testID="huddles-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <FlatList
        testID="huddles-list"
        data={items}
        keyExtractor={(item) => item.channelId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: 1 }}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
              <PulsingDot />
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.textSecondary }}>
                {items.length} active {items.length === 1 ? "huddle" : "huddles"}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View testID="huddles-empty" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Headphones size={48} color={theme.colors.textFaint} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: theme.colors.textFaint, marginBottom: 6 }}>
              No active huddles
            </Text>
            <Text style={{ fontSize: 14, color: theme.colors.textFaint, textAlign: "center", paddingHorizontal: 40 }}>
              Start a huddle from any channel to have a quick audio chat with your team.
            </Text>
          </View>
        }
      />
    </View>
  );
}
