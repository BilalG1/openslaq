import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { VideoTrack } from "@livekit/react-native";
import { Track } from "livekit-client";
import { MicOff, Mic, PhoneOff } from "lucide-react-native";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { routes } from "@/lib/routes";

const CARD_W = 100;
const CARD_H = 140;

export function HuddleFloatingBar() {
  const {
    channelId,
    connected,
    isMuted,
    participants: _participants,
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
  const displayName = channel?.name ?? dm?.otherUser.displayName ?? "Huddle";

  const openModal = () => {
    if (workspaceSlug) {
      router.push(routes.huddle(workspaceSlug!));
    }
  };

  return (
    <View
      testID="huddle-floating-bar"
      style={[styles.container, { top: top + 12 }]}
    >
      <Pressable onPress={openModal} testID="huddle-bar-expand" style={styles.card}>
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

        {/* Green dot indicator instead of text */}
        {connected && <View style={styles.greenDot} />}

        {/* Tiny controls */}
        <View style={styles.controlRow}>
          <Pressable
            testID="huddle-bar-mute"
            onPress={toggleMute}
            hitSlop={8}
            style={[
              styles.controlButton,
              { backgroundColor: isMuted ? "#dc2626" : "rgba(255,255,255,0.2)" },
            ]}
          >
            {isMuted ? <MicOff size={12} color="#fff" /> : <Mic size={12} color="#fff" />}
          </Pressable>
          <Pressable
            testID="huddle-bar-leave"
            onPress={leaveHuddle}
            hitSlop={8}
            style={[styles.controlButton, { backgroundColor: "#dc2626" }]}
          >
            <PhoneOff size={12} color="#fff" />
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
    borderRadius: 24,
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
    fontSize: 32,
    fontWeight: "700",
  },
  greenDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.3)",
  },
  controlRow: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  controlButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
