import { Alert, Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Headphones } from "lucide-react-native";
import type { ChannelId } from "@openslaq/shared";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useHuddleForChannel } from "@/hooks/useHuddleForChannel";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { routes } from "@/lib/routes";

import { GREEN, WHITE } from "@/theme/constants";

interface HuddleHeaderButtonProps {
  channelId: ChannelId;
}

export function HuddleHeaderButton({ channelId }: HuddleHeaderButtonProps) {
  const { joinHuddle } = useHuddle();
  const { activeHuddle, isUserInHuddle } = useHuddleForChannel(channelId);
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  const participantCount = activeHuddle?.participants.length ?? 0;
  const hasActiveHuddle = !!activeHuddle;

  const joinAndNavigate = (id: ChannelId) => {
    joinHuddle(id);
    if (workspaceSlug) {
      router.push(routes.huddle(workspaceSlug));
    }
  };

  const handlePress = () => {
    if (isUserInHuddle) return;

    if (hasActiveHuddle) {
      joinAndNavigate(channelId);
    } else {
      Alert.alert("Start a huddle?", "This will start a live audio huddle in this channel.", [
        { text: "Cancel", style: "cancel" },
        { text: "Start", onPress: () => joinAndNavigate(channelId) },
      ]);
    }
  };

  return (
    <Pressable
      testID={isUserInHuddle ? "huddle-in-progress" : hasActiveHuddle ? "huddle-join-button" : "huddle-start-button"}
      accessibilityRole="button"
      accessibilityLabel={
        isUserInHuddle
          ? `In huddle with ${participantCount} participants`
          : hasActiveHuddle
            ? `Join huddle with ${participantCount} participants`
            : "Start huddle"
      }
      accessibilityHint={
        isUserInHuddle
          ? "You are currently in this huddle"
          : hasActiveHuddle
            ? "Joins the active huddle in this channel"
            : "Opens a dialog to start a new huddle"
      }
      onPress={handlePress}
      style={[styles.button, hasActiveHuddle && styles.buttonActive]}
      hitSlop={8}
    >
      <Headphones size={18} color={hasActiveHuddle ? WHITE : theme.brand.primary} />
      {hasActiveHuddle && (
        <Text style={styles.participantCount}>{participantCount}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  buttonActive: {
    backgroundColor: GREEN,
  },
  participantCount: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "600",
  },
});
