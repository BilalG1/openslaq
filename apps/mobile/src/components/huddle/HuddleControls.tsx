import { Pressable, View, StyleSheet } from "react-native";
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff } from "lucide-react-native";

interface HuddleControlsProps {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

import { GREEN, WHITE, WHITE_OVERLAY_15 } from "@/theme/constants";
const HUDDLE_RED = "#dc2626";

export function HuddleControls({
  isMuted,
  isCameraOn,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}: HuddleControlsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        testID="huddle-control-mute"
        accessibilityRole="button"
        accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
        accessibilityHint="Toggles your microphone"
        onPress={onToggleMute}
        style={[
          styles.button,
          { backgroundColor: isMuted ? HUDDLE_RED : WHITE_OVERLAY_15 },
        ]}
      >
        {isMuted ? <MicOff size={22} color={WHITE} /> : <Mic size={22} color={WHITE} />}
      </Pressable>

      <Pressable
        testID="huddle-control-camera"
        accessibilityRole="button"
        accessibilityLabel={isCameraOn ? "Turn off camera" : "Turn on camera"}
        accessibilityHint="Toggles your camera"
        onPress={onToggleCamera}
        style={[
          styles.button,
          { backgroundColor: isCameraOn ? GREEN : WHITE_OVERLAY_15 },
        ]}
      >
        {isCameraOn ? <Video size={22} color={WHITE} /> : <VideoOff size={22} color={WHITE} />}
      </Pressable>

      <Pressable
        testID="huddle-control-leave"
        accessibilityRole="button"
        accessibilityLabel="Leave huddle"
        accessibilityHint="Leaves the current huddle"
        onPress={onLeave}
        style={[styles.button, styles.leaveButton]}
      >
        <PhoneOff size={22} color={WHITE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveButton: {
    backgroundColor: HUDDLE_RED,
  },
});
