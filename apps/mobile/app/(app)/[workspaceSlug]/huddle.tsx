import { useCallback } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Track } from "livekit-client";
import {
  useTracks,
  useParticipants,
  RoomContext,
} from "@livekit/react-native";
import { ScreenCapturePickerView } from "@livekit/react-native-webrtc";
import type { TrackReference } from "@livekit/react-native";
import { ChevronDown } from "lucide-react-native";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { HuddleControls } from "@/components/huddle/HuddleControls";
import { VideoGrid } from "@/components/huddle/VideoGrid";

function HuddleModalContent() {
  const {
    channelId,
    isMuted,
    isCameraOn,
    isScreenSharing,
    leaveHuddle,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useHuddle();
  const { state } = useChatStore();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  const lkParticipants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
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

  const gridParticipants = lkParticipants.map((p) => {
    const isLocal = p.isLocal;
    const userId = p.identity;
    const displayName = p.name || userId;

    const videoTrackRef = tracks.find(
      (t): t is TrackReference =>
        t.participant.identity === userId &&
        t.source === Track.Source.Camera &&
        "publication" in t,
    );

    const screenShareTrackRef = tracks.find(
      (t): t is TrackReference =>
        t.participant.identity === userId &&
        t.source === Track.Source.ScreenShare &&
        "publication" in t,
    );

    let muted = true;
    let camera = false;
    let screenSharing = false;
    for (const pub of p.trackPublications.values()) {
      if (pub.source === Track.Source.Microphone) {
        muted = pub.isMuted;
      } else if (pub.source === Track.Source.Camera) {
        camera = !pub.isMuted && !!pub.track;
      } else if (pub.source === Track.Source.ScreenShare) {
        screenSharing = !pub.isMuted && !!pub.track;
      }
    }

    return {
      userId,
      displayName,
      isMuted: muted,
      isCameraOn: camera,
      isLocal,
      videoTrackRef: camera ? videoTrackRef : undefined,
      screenShareTrackRef: screenSharing ? screenShareTrackRef : undefined,
    };
  });

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" && <ScreenCapturePickerView />}

      {/* Translucent header pill overlay */}
      <View style={[styles.headerOverlay, { top: top + 8 }]}>
        <Pressable onPress={handleCollapse} hitSlop={8} style={styles.headerPill}>
          <ChevronDown size={16} color="#fff" />
          <Text style={styles.headerTitle} numberOfLines={1}>{label}</Text>
          <Text style={styles.headerCount}>
            {lkParticipants.length}
          </Text>
        </Pressable>
      </View>

      {/* Video Grid */}
      <VideoGrid participants={gridParticipants} safeAreaTop={top} safeAreaBottom={bottom} />

      {/* Floating Controls - no background */}
      <View style={{ paddingBottom: bottom }}>
        <HuddleControls
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreenShare}
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
    backgroundColor: "#000",
  },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    maxWidth: 180,
  },
  headerCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },
});
