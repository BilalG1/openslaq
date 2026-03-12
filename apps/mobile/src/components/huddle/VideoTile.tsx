import { View, Text, StyleSheet } from "react-native";
import { VideoTrack } from "@livekit/react-native";
import type { TrackReference } from "@livekit/react-native";
import { ScreenShare, MicOff } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface VideoTileProps {
  userId: string;
  displayName: string;
  isMuted: boolean;
  isLocal: boolean;
  videoTrackRef: TrackReference | undefined;
  isScreenShare?: boolean;
  style?: object;
}

export function VideoTile({
  userId,
  displayName,
  isMuted,
  isLocal,
  videoTrackRef,
  isScreenShare,
  style,
}: VideoTileProps) {
  const { theme } = useMobileTheme();

  return (
    <View
      testID={`video-tile-${userId}`}
      style={[styles.container, { backgroundColor: theme.colors.surfaceTertiary }, style]}
    >
      {videoTrackRef ? (
        <VideoTrack
          trackRef={videoTrackRef}
          style={styles.video}
          objectFit={isScreenShare ? "contain" : "cover"}
          mirror={!isScreenShare && isLocal}
        />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.colors.avatarFallbackBg }]}>
          <Text style={[styles.avatarText, { color: theme.colors.avatarFallbackText }]}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.nameOverlay}>
        <Text style={styles.nameText} numberOfLines={1}>
          {displayName}
          {isLocal ? " (You)" : ""}
        </Text>
        {isScreenShare && <ScreenShare size={12} color="#fff" />}
        {isMuted && !isScreenShare && <MicOff size={12} color="#fff" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
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
  nameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  nameText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});
