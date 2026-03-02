import { Pressable, Text, View, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

const GREEN = "#22c55e";

interface HuddleControlsProps {
  isMuted: boolean;
  isCameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

export function HuddleControls({
  isMuted,
  isCameraOn,
  onToggleMute,
  onToggleCamera,
  onLeave,
}: HuddleControlsProps) {
  const { theme } = useMobileTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Pressable
        testID="huddle-control-mute"
        onPress={onToggleMute}
        style={[
          styles.button,
          {
            backgroundColor: isMuted
              ? theme.brand.danger
              : theme.colors.surfaceTertiary,
          },
        ]}
      >
        <Text style={styles.icon}>{isMuted ? "\u{1F507}" : "\u{1F3A4}"}</Text>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {isMuted ? "Unmute" : "Mute"}
        </Text>
      </Pressable>

      <Pressable
        testID="huddle-control-camera"
        onPress={onToggleCamera}
        style={[
          styles.button,
          {
            backgroundColor: isCameraOn
              ? GREEN
              : theme.colors.surfaceTertiary,
          },
        ]}
      >
        <Text style={styles.icon}>{"\u{1F4F7}"}</Text>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {isCameraOn ? "Stop" : "Camera"}
        </Text>
      </Pressable>

      <Pressable
        testID="huddle-control-leave"
        onPress={onLeave}
        style={[styles.button, { backgroundColor: theme.brand.danger }]}
      >
        <Text style={styles.icon}>{"\u{1F6D1}"}</Text>
        <Text style={[styles.label, { color: "#fff" }]}>Leave</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  button: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
