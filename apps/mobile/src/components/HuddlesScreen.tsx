import { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, FlatList, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Headphones, Monitor, Users } from "lucide-react-native";
import type { ChannelId, MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useHuddle } from "@/contexts/HuddleProvider";
import { formatHuddleDuration } from "@/utils/message-list-utils";
import type { HuddleState } from "@openslaq/shared";
import { routes } from "@/lib/routes";

import { TRANSPARENT } from "@/theme/constants";

const AVATAR_PALETTE = ["#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"] as const;

function PulsingDot({ color }: { color: string }) {
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
      style={[staticStyles.pulsingDot, { backgroundColor: color, opacity: anim }]}
    />
  );
}

interface HuddleCardItem {
  channelId: ChannelId;
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
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const items: HuddleCardItem[] = Object.values(state.activeHuddles)
    .map((huddle) => {
      const channel = state.channels.find((c) => c.id === huddle.channelId);
      const dm = state.dms.find((d) => d.channel.id === huddle.channelId);
      const groupDm = state.groupDms.find((g) => g.channel.id === huddle.channelId);
      const channelName = channel
        ? `# ${channel.name}`
        : dm
          ? dm.otherUser.displayName
          : groupDm
            ? groupDm.members.map((m) => m.displayName).join(", ")
            : "Huddle";
      return {
        channelId: huddle.channelId,
        channelName,
        huddle,
        isCurrent: state.currentHuddleChannelId === huddle.channelId,
      };
    })
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

  const handleJoin = useCallback(
    (channelId: ChannelId) => {
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
        style={[
          styles.card,
          isCurrent ? styles.cardCurrentBorder : styles.cardNoBorder,
        ]}
      >
        <Pressable
          testID={`huddle-card-${channelId}`}
          onPress={() => handleJoin(channelId)}
          accessibilityRole="button"
          accessibilityLabel={`Join huddle in ${channelName}`}
          accessibilityHint="Joins this huddle"
          style={({ pressed }) => ({
            padding: 16,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {/* Channel name + duration */}
          <View style={styles.cardHeader}>
            <Text style={styles.channelName} numberOfLines={1}>
              {channelName}
            </Text>
            <View
              style={[styles.durationBadge, isCurrent ? styles.durationBadgeCurrent : styles.durationBadgeIdle]}
            >
              <Text style={[styles.durationText, isCurrent ? styles.durationTextCurrent : styles.durationTextIdle]}>
                {formatHuddleDuration(huddle.startedAt)}
              </Text>
            </View>
          </View>

          {/* Participants row */}
          <View style={styles.participantsRow}>
            {/* Overlapping avatar circles */}
            <View style={styles.avatarsRow}>
              {huddle.participants.slice(0, 5).map((p, i) => (
                <View
                  key={String(p.userId)}
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: AVATAR_PALETTE[i % 5] },
                    i > 0 ? staticStyles.avatarOverlap : null,
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {String(p.userId).charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.participantCountRow}>
              <Users size={13} color={theme.colors.textMuted} />
              <Text style={styles.participantCountText}>
                {participantCount} {participantCount === 1 ? "person" : "people"}
              </Text>
            </View>
          </View>

          {/* Screen share indicator + join hint */}
          <View style={styles.bottomRow}>
            {huddle.screenShareUserId ? (
              <View style={styles.screenShareRow}>
                <Monitor size={13} color={theme.colors.screenShareText} />
                <Text style={styles.screenShareText}>Screen sharing</Text>
              </View>
            ) : (
              <View />
            )}
            <Text style={styles.joinHintText}>
              {isCurrent ? "Tap to return" : "Tap to join"}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View testID="huddles-screen" style={styles.screen}>
      <FlatList
        testID="huddles-list"
        data={items}
        keyExtractor={(item) => item.channelId}
        renderItem={renderItem}
        contentContainerStyle={staticStyles.listContent}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={staticStyles.listHeader}>
              <PulsingDot color={theme.colors.huddleActiveText} />
              <Text style={styles.headerCountText}>
                {items.length} active {items.length === 1 ? "huddle" : "huddles"}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View testID="huddles-empty" style={staticStyles.emptyContainer}>
            <Headphones size={48} color={theme.colors.textFaint} style={staticStyles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              No active huddles
            </Text>
            <Text style={styles.emptyDescription}>
              Start a huddle from any channel to have a quick audio chat with your team.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceSecondary,
      overflow: "hidden",
    },
    cardCurrentBorder: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.huddleActiveText,
    },
    cardNoBorder: {
      borderLeftWidth: 0,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    channelName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flex: 1,
    },
    durationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    durationBadgeCurrent: {
      backgroundColor: theme.colors.huddleActiveText,
    },
    durationBadgeIdle: {
      backgroundColor: theme.colors.huddleActiveBg,
    },
    durationText: {
      fontSize: 12,
      fontWeight: "600",
    },
    durationTextCurrent: {
      color: theme.colors.headerText,
    },
    durationTextIdle: {
      color: theme.colors.huddleActiveText,
    },
    participantsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    avatarsRow: {
      flexDirection: "row",
      marginRight: 8,
    },
    avatarCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.headerText,
    },
    participantCountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    participantCountText: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    screenShareRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    screenShareText: {
      fontSize: 12,
      color: theme.colors.screenShareText,
    },
    joinHintText: {
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    headerCountText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textFaint,
      marginBottom: 6,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.colors.textFaint,
      textAlign: "center",
      paddingHorizontal: 40,
    },
  });
