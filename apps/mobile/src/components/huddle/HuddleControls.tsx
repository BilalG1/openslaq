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

const GREEN = "#22c55e";

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
        onPress={onToggleMute}
        style={[
          styles.button,
          { backgroundColor: isMuted ? "#dc2626" : "rgba(255,255,255,0.15)" },
        ]}
      >
        {isMuted ? <MicOff size={22} color="#fff" /> : <Mic size={22} color="#fff" />}
      </Pressable>

      <Pressable
        testID="huddle-control-camera"
        onPress={onToggleCamera}
        style={[
          styles.button,
          { backgroundColor: isCameraOn ? GREEN : "rgba(255,255,255,0.15)" },
        ]}
      >
        {isCameraOn ? <Video size={22} color="#fff" /> : <VideoOff size={22} color="#fff" />}
      </Pressable>

      <Pressable
        testID="huddle-control-screen-share"
        onPress={onToggleScreenShare}
        style={[
          styles.button,
          { backgroundColor: isScreenSharing ? GREEN : "rgba(255,255,255,0.15)" },
        ]}
      >
        <ScreenShare size={22} color="#fff" />
      </Pressable>

      <Pressable
        testID="huddle-control-leave"
        onPress={onLeave}
        style={[styles.button, styles.leaveButton]}
      >
        <PhoneOff size={24} color="#fff" />
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dc2626",
  },
});
