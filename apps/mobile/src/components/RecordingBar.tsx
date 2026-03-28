import { useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Circle } from "lucide-react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface RecordingBarProps {
  duration: number;
  onCancel: () => void;
  onStopAndSend: () => void;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RecordingBar({ duration, onCancel, onStopAndSend }: RecordingBarProps) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View
      testID="recording-bar"
      style={styles.recordingBar}
    >
      <Pressable
        testID="recording-cancel"
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel recording"
        accessibilityHint="Cancels the voice recording"
      >
        <Text style={styles.recordingCancelText}>Cancel</Text>
      </Pressable>
      <View style={staticStyles.recordingCenter}>
        <Circle size={12} color={theme.colors.recordingIndicator} fill={theme.colors.recordingIndicator} style={staticStyles.recordingDot} />
        <Text testID="recording-timer" style={styles.recordingTimerText}>
          {formatDuration(duration)}
        </Text>
      </View>
      <Pressable
        testID="recording-stop-send"
        style={styles.recordingSendButton}
        onPress={onStopAndSend}
        accessibilityRole="button"
        accessibilityLabel="Send voice message"
        accessibilityHint="Stops recording and sends the voice message"
      >
        <Text style={styles.sendArrowText}>↑</Text>
      </Pressable>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  recordingCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingDot: {
    marginRight: 6,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    recordingBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.surface,
    },
    recordingCancelText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    recordingTimerText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.textPrimary,
    },
    recordingSendButton: {
      width: 36,
      height: 36,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.brand.primary,
    },
    sendArrowText: {
      color: theme.colors.headerText,
      fontWeight: "bold",
      fontSize: 16,
    },
  });
