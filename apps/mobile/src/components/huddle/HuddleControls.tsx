import { Pressable, Text, View, StyleSheet } from "react-native";
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

const GREEN = "#22c55e";

interface HuddleControlsProps {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export function HuddleControls({
  isMuted,
  isCameraOn,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
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
        {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
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
        {isCameraOn ? <Video size={24} color="#fff" /> : <VideoOff size={24} color="#fff" />}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {isCameraOn ? "Stop" : "Camera"}
        </Text>
      </Pressable>

      <Pressable
        testID="huddle-control-screen-share"
        onPress={onToggleScreenShare}
        style={[
          styles.button,
          {
            backgroundColor: isScreenSharing
              ? GREEN
              : theme.colors.surfaceTertiary,
          },
        ]}
      >
        <ScreenShare size={24} color="#fff" />
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {isScreenSharing ? "Stop" : "Share"}
        </Text>
      </Pressable>

      <Pressable
        testID="huddle-control-leave"
        onPress={onLeave}
        style={[styles.button, { backgroundColor: theme.brand.danger }]}
      >
        <PhoneOff size={24} color="#fff" />
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
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
