import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { TrackReference } from "@livekit/react-native";
import type { UserId } from "@openslaq/shared";
import { VideoTile } from "./VideoTile";

interface GridParticipant {
  userId: UserId;
  displayName: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isLocal: boolean;
  videoTrackRef: TrackReference | undefined;
  screenShareTrackRef?: TrackReference | undefined;
}

interface VideoGridProps {
  participants: GridParticipant[];
  safeAreaTop?: number;
  safeAreaBottom?: number;
}

export function VideoGrid({ participants, safeAreaTop = 0, safeAreaBottom = 0 }: VideoGridProps) {
  const { width, height } = useWindowDimensions();
  const count = participants.length;

  if (count === 0) return null;

  // Presentation layout: screen share takes main area, others in bottom strip
  const screenSharer = participants.find((p) => p.screenShareTrackRef);
  if (screenSharer) {
    const availableHeight = height - safeAreaTop - safeAreaBottom - 120;
    const availableWidth = width - 20;
    const stripTileSize = 72;

    return (
      <View style={styles.fixedContainer}>
        <VideoTile
          userId={screenSharer.userId}
          displayName={screenSharer.displayName}
          isMuted={screenSharer.isMuted}
          isLocal={screenSharer.isLocal}
          videoTrackRef={screenSharer.screenShareTrackRef}
          isScreenShare
          style={{ width: availableWidth, height: availableHeight - stripTileSize - 12 }}
        />
        <ScrollView
          horizontal
          style={styles.stripContainer}
          contentContainerStyle={styles.stripContent}
        >
          {participants.map((p) => (
            <VideoTile
              key={p.userId}
              {...p}
              style={{ width: stripTileSize, height: stripTileSize }}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // 5+ participants: scrollable 2-column grid
  if (count > 4) {
    const tileWidth = (width - 30) / 2;
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

  const availableHeight = height - safeAreaTop - safeAreaBottom - 120;
  const availableWidth = width - 20;

  if (count === 1) {
    const p = participants[0]!;
    return (
      <View style={styles.fixedContainer}>
        <VideoTile
          {...p}
          style={{ width: availableWidth, height: availableHeight }}
        />
      </View>
    );
  }

  // 2 participants: side-by-side (landscape split)
  if (count === 2) {
    const tileWidth2 = (availableWidth - 6) / 2;
    return (
      <View style={styles.fixedContainer}>
        <View style={styles.sideBySide}>
          {participants.map((p) => (
            <VideoTile
              key={p.userId}
              {...p}
              style={{ width: tileWidth2, height: availableHeight }}
            />
          ))}
        </View>
      </View>
    );
  }

  // 3-4: 2x2 grid
  const tileWidth = (availableWidth - 6) / 2;
  const tileHeight = (availableHeight - 6) / 2;
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
    padding: 10,
    gap: 6,
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sideBySide: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  stripContainer: {
    flexGrow: 0,
  },
  stripContent: {
    gap: 6,
  },
});
