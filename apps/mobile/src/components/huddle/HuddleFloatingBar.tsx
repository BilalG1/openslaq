import { Pressable, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";

const GREEN = "#22c55e";

export function HuddleFloatingBar() {
  const { channelId, connected, isMuted, isCameraOn, participants, leaveHuddle, toggleMute, toggleCamera } =
    useHuddle();
  const { state } = useChatStore();
  const { bottom } = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  if (!channelId) return null;

  const channel = state.channels.find((c) => c.id === channelId);
  const dm = state.dms.find((d) => d.channel.id === channelId);
  const label = channel ? `# ${channel.name}` : dm?.otherUser.displayName ?? "Huddle";

  const openModal = () => {
    if (workspaceSlug) {
      router.push(`/(app)/${workspaceSlug}/huddle`);
    }
  };

  return (
    <View
      testID="huddle-floating-bar"
      style={[
        styles.container,
        {
          bottom: bottom + 60,
          backgroundColor: theme.colors.surfaceTertiary,
          borderColor: GREEN,
        },
      ]}
    >
      <Pressable
        style={styles.infoSection}
        onPress={openModal}
        testID="huddle-bar-expand"
      >
        <View style={[styles.indicator, { backgroundColor: GREEN }]} />
        <Text
          style={[styles.label, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {connected && (
          <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
            {participants.length}
          </Text>
        )}
      </Pressable>

      <View style={styles.controls}>
        <Pressable
          testID="huddle-bar-mute"
          onPress={toggleMute}
          style={[
            styles.controlButton,
            {
              backgroundColor: isMuted
                ? theme.brand.danger
                : theme.colors.surfaceSecondary,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>
            {isMuted ? "\u{1F507}" : "\u{1F3A4}"}
          </Text>
        </Pressable>

        <Pressable
          testID="huddle-bar-camera"
          onPress={toggleCamera}
          style={[
            styles.controlButton,
            {
              backgroundColor: isCameraOn
                ? GREEN
                : theme.colors.surfaceSecondary,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>
            {isCameraOn ? "\u{1F4F7}" : "\u{1F4F7}"}
          </Text>
        </Pressable>

        <Pressable
          testID="huddle-bar-leave"
          onPress={leaveHuddle}
          style={[styles.controlButton, { backgroundColor: theme.brand.danger }]}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>
            {"\u{1F6D1}"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  count: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
