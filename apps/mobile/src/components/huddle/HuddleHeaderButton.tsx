import { Pressable, Text, View, StyleSheet } from "react-native";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useHuddleForChannel } from "@/hooks/useHuddleForChannel";
import { useMobileTheme } from "@/theme/ThemeProvider";

const GREEN = "#22c55e";

interface HuddleHeaderButtonProps {
  channelId: string;
}

export function HuddleHeaderButton({ channelId }: HuddleHeaderButtonProps) {
  const { joinHuddle } = useHuddle();
  const { activeHuddle, isUserInHuddle } = useHuddleForChannel(channelId);
  const { theme } = useMobileTheme();

  if (isUserInHuddle) {
    return (
      <View testID="huddle-in-progress" style={styles.inHuddleBadge}>
        <View style={styles.pulseDot} />
        <Text style={styles.inHuddleText}>In huddle</Text>
      </View>
    );
  }

  if (activeHuddle) {
    return (
      <Pressable
        testID="huddle-join-button"
        onPress={() => joinHuddle(channelId)}
        style={[styles.joinButton, { borderColor: GREEN }]}
      >
        <View style={styles.pulseDot} />
        <Text style={styles.joinText}>
          Join ({activeHuddle.participants.length})
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="huddle-start-button"
      onPress={() => joinHuddle(channelId)}
      style={styles.startButton}
      hitSlop={8}
    >
      <Text style={{ color: theme.brand.primary, fontSize: 18 }}>
        {"\u{1F3A7}"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inHuddleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  inHuddleText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "500",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  joinText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "600",
  },
  startButton: {
    paddingHorizontal: 4,
  },
});
