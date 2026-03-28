import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { VideoTrack } from "@livekit/react-native";
import { Track } from "livekit-client";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { routes } from "@/lib/routes";

const CARD_W = 100;
const CARD_H = 140;
import { GREEN, BLACK, DARK_OVERLAY_30 } from "@/theme/constants";

export function HuddleFloatingBar() {
  const {
    channelId,
    connected,
    minimized,
    room,
  } = useHuddle();
  const { state } = useChatStore();
  const { top } = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  if (!channelId || !minimized) return null;

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
      <Pressable
        onPress={openModal}
        testID="huddle-bar-expand"
        accessibilityRole="button"
        accessibilityLabel={`Expand huddle with ${displayName}`}
        accessibilityHint="Opens the huddle screen"
        style={styles.card}
      >
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

        {/* Green dot indicator */}
        {connected && <View style={styles.greenDot} />}
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
    shadowColor: BLACK,
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
    backgroundColor: GREEN,
    borderWidth: 1.5,
    borderColor: DARK_OVERLAY_30,
  },
});
