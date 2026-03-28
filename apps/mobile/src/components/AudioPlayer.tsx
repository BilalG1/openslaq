import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Play, Pause } from "lucide-react-native";
import { Audio } from "expo-av";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  uri: string;
  filename: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    playButton: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      backgroundColor: theme.brand.primary,
    },
    infoContainer: {
      flex: 1,
      marginRight: 8,
    },
    filename: {
      fontSize: 12,
      marginBottom: 4,
      color: theme.colors.textPrimary,
    },
    progressTrack: {
      height: 4,
      borderRadius: 9999,
      backgroundColor: theme.colors.borderDefault,
    },
    progressFill: {
      height: 4,
      borderRadius: 9999,
      backgroundColor: theme.brand.primary,
    },
    time: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });

export function AudioPlayer({ uri, filename }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const loadAndPlay = useCallback(async () => {
    if (!soundRef.current) {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound, status } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      if (status && "durationMillis" in status) {
        setDurationMs(status.durationMillis ?? 0);
      }
      sound.setOnPlaybackStatusUpdate((s) => {
        if (!s.isLoaded) return;
        setPositionMs(s.positionMillis);
        setDurationMs(s.durationMillis ?? 0);
        setIsPlaying(s.isPlaying);
        if (s.didJustFinish) {
          setIsPlaying(false);
          setPositionMs(0);
        }
      });
    }
    await soundRef.current.playAsync();
  }, [uri]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
    } else {
      await loadAndPlay();
    }
  }, [isPlaying, loadAndPlay]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
    };
  }, [uri]);

  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
    <View testID="audio-player" style={styles.container}>
      <Pressable
        testID="audio-play-button"
        onPress={() => void togglePlayPause()}
        accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
        accessibilityHint={isPlaying ? "Pauses the current audio" : "Plays the audio file"}
        style={styles.playButton}
      >
        {isPlaying ? (
          <Pause size={14} color={theme.colors.headerText} />
        ) : (
          <Play size={14} color={theme.colors.headerText} />
        )}
      </Pressable>
      <View style={styles.infoContainer}>
        <Text style={styles.filename} numberOfLines={1}>
          {filename}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
        </View>
      </View>
      <Text style={styles.time}>
        {formatTime(positionMs)} / {formatTime(durationMs)}
      </Text>
    </View>
  );
}
