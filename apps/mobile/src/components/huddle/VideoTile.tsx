import { View, Text, StyleSheet } from "react-native";
import { VideoTrack } from "@livekit/react-native";
import type { TrackReference } from "@livekit/react-native";
import { MicOff, ScreenShare } from "lucide-react-native";

interface VideoTileProps {
  userId: string;
  displayName: string;
  isMuted: boolean;
  isLocal: boolean;
  videoTrackRef: TrackReference | undefined;
  isScreenShare?: boolean;
  style?: object;
}

const GRADIENT_COLORS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
];

function getGradientIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % GRADIENT_COLORS.length;
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
  const gradientIdx = getGradientIndex(displayName);
  const gradientColor = GRADIENT_COLORS[gradientIdx][0];

  return (
    <View testID={`video-tile-${userId}`} style={[styles.container, style]}>
      {videoTrackRef ? (
        <VideoTrack
          trackRef={videoTrackRef}
          style={styles.video}
          objectFit={isScreenShare ? "contain" : "cover"}
          mirror={!isScreenShare && isLocal}
        />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: gradientColor }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Floating name pill - bottom center */}
      <View style={styles.namePill}>
        <Text style={styles.nameText} numberOfLines={1}>
          {displayName}
          {isLocal ? " (You)" : ""}
        </Text>
        {isScreenShare && <ScreenShare size={10} color="#fff" />}
        {isMuted && !isScreenShare && <MicOff size={10} color="#fff" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
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
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  namePill: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  nameText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
  },
});
