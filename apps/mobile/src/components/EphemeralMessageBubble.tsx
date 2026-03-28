import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { EphemeralMessage } from "@openslaq/shared";
import { formatTime } from "@/lib/time";

interface Props {
  message: EphemeralMessage;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.ephemeralBg,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.ephemeralBorder,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    senderName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    time: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    body: {
      fontSize: 15,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    ephemeralLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
      fontStyle: "italic",
    },
  });

export function EphemeralMessageBubble({ message }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const time = formatTime(message.createdAt);

  return (
    <View
      testID={`ephemeral-message-${message.id}`}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <Text style={styles.senderName}>
          {message.senderName}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text style={styles.body}>
        {message.text}
      </Text>
      <Text
        testID="ephemeral-label"
        style={styles.ephemeralLabel}
      >
        Only visible to you
      </Text>
    </View>
  );
}
