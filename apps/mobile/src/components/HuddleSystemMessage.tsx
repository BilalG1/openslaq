import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Headphones } from "lucide-react-native";
import type { HuddleMessage } from "@openslaq/shared";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  message: HuddleMessage;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginVertical: 4,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleActive: {
      backgroundColor: theme.colors.huddleActiveBg,
    },
    iconCircleEnded: {
      backgroundColor: theme.colors.surfaceTertiary,
    },
    contentContainer: {
      flex: 1,
    },
    mainText: {
      fontSize: 13,
      color: theme.colors.textFaint,
    },
    senderName: {
      fontWeight: "600",
    },
    durationText: {
      fontSize: 12,
      color: theme.colors.textFaint,
      marginTop: 2,
    },
  });

export function HuddleSystemMessage({ message }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const meta = message.metadata;
  if (!meta) return null;
  const senderName = message.senderDisplayName ?? message.userId;
  const isEnded = Boolean(meta.huddleEndedAt);

  return (
    <View
      testID="huddle-system-message"
      style={styles.container}
    >
      <View
        style={[styles.iconCircle, isEnded ? styles.iconCircleEnded : styles.iconCircleActive]}
      >
        <Headphones
          size={16}
          color={isEnded ? theme.colors.textFaint : theme.colors.huddleActiveText}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.mainText}>
          <Text style={styles.senderName}>{senderName}</Text> started a huddle
        </Text>
        {isEnded && meta.duration != null && (
          <Text style={styles.durationText}>
            Lasted {formatDuration(meta.duration)}
          </Text>
        )}
      </View>
    </View>
  );
}
