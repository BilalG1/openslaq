import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { VideoTrack } from "@livekit/react-native";
import { Track } from "livekit-client";
import { MicOff, Mic, PhoneOff } from "lucide-react-native";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";

const CARD_W = 120;
const CARD_H = 160;

export function HuddleFloatingBar() {
  const {
    channelId,
    connected,
    isMuted,
    participants,
    room,
    leaveHuddle,
    toggleMute,
  } = useHuddle();
  const { state } = useChatStore();
  const { top } = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  if (!channelId) return null;

  const localParticipant = room?.localParticipant;
  const cameraTrack = localParticipant
    ?.getTrackPublications()
    .find(
      (pub) =>
        pub.source === Track.Source.Camera && pub.track && !pub.isMuted,
    );
  const trackRef = cameraTrack
    ? {
        participant: localParticipant!,
        publication: cameraTrack,
        source: Track.Source.Camera,
      }
    : undefined;

  const channel = state.channels.find((c) => c.id === channelId);
  const dm = state.dms.find((d) => d.channel.id === channelId);
  const label = channel ? `# ${channel.name}` : dm?.otherUser.displayName ?? "Huddle";
  const displayName = channel?.name ?? dm?.otherUser.displayName ?? "Huddle";

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
          top: top + 12,
        },
      ]}
    >
      <Pressable onPress={openModal} testID="huddle-bar-expand" style={styles.card}>
        {/* Video / Avatar */}
        {trackRef ? (
          <VideoTrack
            trackRef={trackRef}
            style={styles.video}
            objectFit="cover"
            mirror
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: theme.colors.avatarFallbackBg ?? theme.colors.surfaceTertiary },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: theme.colors.avatarFallbackText ?? theme.colors.textPrimary },
              ]}
            >
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Top overlay with channel name */}
        <View style={styles.topGradient}>
          <Text style={styles.channelName} numberOfLines={1}>
            {label}
          </Text>
          {connected && (
            <Text style={styles.participantCount}>{participants.length}</Text>
          )}
        </View>

        {/* Bottom control bar */}
        <View style={styles.bottomBar}>
          <Pressable
            testID="huddle-bar-mute"
            onPress={toggleMute}
            style={[
              styles.controlButton,
              {
                backgroundColor: isMuted
                  ? theme.brand.danger
                  : "rgba(255,255,255,0.2)",
              },
            ]}
          >
            {isMuted ? (
              <MicOff size={14} color="#fff" />
            ) : (
              <Mic size={14} color="#fff" />
            )}
          </Pressable>
          <Pressable
            testID="huddle-bar-leave"
            onPress={leaveHuddle}
            style={[
              styles.controlButton,
              { backgroundColor: theme.brand.danger },
            ]}
          >
            <PhoneOff size={14} color="#fff" />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 12,
    zIndex: 999,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  card: {
    flex: 1,
    position: "relative",
  },
  video: {
    flex: 1,
    width: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  channelName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  participantCount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  controlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
