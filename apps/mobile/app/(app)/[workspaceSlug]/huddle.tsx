import { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { useNavigation, useRouter } from "expo-router";
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
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";
import { asUserId } from "@openslaq/shared";

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
    setMinimized,
  } = useHuddle();
  const { state } = useChatStore();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);

  const lkParticipants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  const navigation = useNavigation();
  const leavingRef = useRef(false);

  const channel = state.channels.find((c) => c.id === channelId);
  const dm = state.dms.find((d) => d.channel.id === channelId);
  const label = channel ? `# ${channel.name}` : dm?.otherUser.displayName ?? "Huddle";

  const handleLeave = useCallback(() => {
    leavingRef.current = true;
    leaveHuddle();
    router.back();
  }, [leaveHuddle, router]);

  const handleCollapse = useCallback(() => {
    setMinimized(true);
    router.back();
  }, [setMinimized, router]);

  // When the modal is dismissed (swipe down or programmatic back) without
  // explicitly leaving, minimize the huddle so the floating bar appears.
  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      if (!leavingRef.current) {
        setMinimized(true);
      }
    });
  }, [navigation, setMinimized]);

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
      userId: asUserId(userId),
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
        <Pressable onPress={handleCollapse} hitSlop={8} style={styles.headerPill} accessibilityRole="button" accessibilityLabel="Collapse huddle" accessibilityHint="Minimizes the huddle view">
          <ChevronDown size={16} color={theme.colors.headerText} />
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
  const { room, channelId } = useHuddle();
  const router = useRouter();

  // Auto-dismiss the modal when the huddle ends or connection fails
  // (channelId becomes null after error cleanup, and room is never set)
  useEffect(() => {
    if (!room && !channelId) {
      router.back();
    }
  }, [room, channelId, router]);

  if (!room) {
    return null;
  }

  return (
    <RoomContext.Provider value={room}>
      <HuddleModalContent />
    </RoomContext.Provider>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.huddleBg,
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
      backgroundColor: theme.colors.overlayLight,
    },
    headerTitle: {
      color: theme.colors.headerText,
      fontSize: 15,
      fontWeight: "600",
      maxWidth: 180,
    },
    headerCount: {
      color: theme.colors.overlayLightText,
      fontSize: 13,
      fontWeight: "500",
    },
  });
