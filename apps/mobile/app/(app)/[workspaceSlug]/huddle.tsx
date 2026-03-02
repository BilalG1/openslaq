import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Track } from "livekit-client";
import { useTracks, useParticipants, RoomContext } from "@livekit/react-native";
import type { TrackReference } from "@livekit/react-native";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { HuddleControls } from "@/components/huddle/HuddleControls";
import { VideoGrid } from "@/components/huddle/VideoGrid";
import { useMobileTheme } from "@/theme/ThemeProvider";

function HuddleModalContent() {
  const { channelId, isMuted, isCameraOn, leaveHuddle, toggleMute, toggleCamera } =
    useHuddle();
  const { state } = useChatStore();
  const { top, bottom } = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const lkParticipants = useParticipants();
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  const channel = state.channels.find((c) => c.id === channelId);
  const dm = state.dms.find((d) => d.channel.id === channelId);
  const label = channel ? `# ${channel.name}` : dm?.otherUser.displayName ?? "Huddle";

  const handleLeave = useCallback(() => {
    leaveHuddle();
    router.back();
  }, [leaveHuddle, router]);

  const handleCollapse = useCallback(() => {
    router.back();
  }, [router]);

  // Build grid participants from LiveKit participants
  const gridParticipants = lkParticipants.map((p) => {
    const isLocal = p.isLocal;
    const userId = p.identity;
    const displayName = p.name || userId;

    // Find camera track for this participant
    const videoTrackRef = tracks.find(
      (t): t is TrackReference =>
        t.participant.identity === userId &&
        t.source === Track.Source.Camera &&
        "publication" in t,
    );

    let muted = true;
    let camera = false;
    for (const pub of p.trackPublications.values()) {
      if (pub.source === Track.Source.Microphone) {
        muted = pub.isMuted;
      } else if (pub.source === Track.Source.Camera) {
        camera = !pub.isMuted && !!pub.track;
      }
    }

    return {
      userId,
      displayName,
      isMuted: muted,
      isCameraOn: camera,
      isLocal,
      videoTrackRef: camera ? videoTrackRef : undefined,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <Pressable onPress={handleCollapse} hitSlop={8}>
          <Text style={[styles.closeButton, { color: theme.colors.textSecondary }]}>
            {"\u{2B07}\u{FE0F}"}
          </Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {label}
          </Text>
          <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
            {lkParticipants.length} participant
            {lkParticipants.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Video Grid */}
      <VideoGrid participants={gridParticipants} />

      {/* Controls */}
      <View style={{ paddingBottom: bottom }}>
        <HuddleControls
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onLeave={handleLeave}
        />
      </View>
    </View>
  );
}

export default function HuddleModal() {
  const { room } = useHuddle();

  if (!room) {
    return null;
  }

  return (
    <RoomContext.Provider value={room}>
      <HuddleModalContent />
    </RoomContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: {
    fontSize: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerCount: {
    fontSize: 12,
    marginTop: 2,
  },
});
