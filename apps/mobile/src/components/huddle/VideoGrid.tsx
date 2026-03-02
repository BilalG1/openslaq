import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { TrackReference } from "@livekit/react-native";
import { VideoTile } from "./VideoTile";

interface GridParticipant {
  userId: string;
  displayName: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isLocal: boolean;
  videoTrackRef: TrackReference | undefined;
}

interface VideoGridProps {
  participants: GridParticipant[];
}

export function VideoGrid({ participants }: VideoGridProps) {
  const { width, height } = useWindowDimensions();
  const count = participants.length;

  if (count === 0) return null;

  // For 5+ participants, use a scrollable 2-column grid
  if (count > 4) {
    const tileWidth = (width - 36) / 2;
    const tileHeight = tileWidth * 0.75;
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {participants.map((p) => (
            <VideoTile
              key={p.userId}
              {...p}
              style={{ width: tileWidth, height: tileHeight }}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  // Calculate tile dimensions for fixed grids
  const availableHeight = height - 200; // account for header + controls
  const availableWidth = width - 24;

  if (count === 1) {
    return (
      <View style={styles.fixedContainer}>
        <VideoTile
          {...participants[0]}
          style={{ width: availableWidth, height: availableHeight }}
        />
      </View>
    );
  }

  if (count === 2) {
    const tileHeight = (availableHeight - 8) / 2;
    return (
      <View style={styles.fixedContainer}>
        {participants.map((p) => (
          <VideoTile
            key={p.userId}
            {...p}
            style={{ width: availableWidth, height: tileHeight }}
          />
        ))}
      </View>
    );
  }

  // 3-4: 2x2 grid
  const tileWidth = (availableWidth - 8) / 2;
  const tileHeight = (availableHeight - 8) / 2;
  return (
    <View style={styles.fixedContainer}>
      <View style={styles.grid}>
        {participants.map((p) => (
          <VideoTile
            key={p.userId}
            {...p}
            style={{ width: tileWidth, height: tileHeight }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedContainer: {
    flex: 1,
    padding: 12,
    gap: 8,
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
