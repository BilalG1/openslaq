import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ChannelEventMessage, MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  message: ChannelEventMessage;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      paddingVertical: 8,
    },
    text: {
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    senderName: {
      fontWeight: "600",
    },
  });

export function ChannelEventSystemMessage({ message }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const senderName = message.senderDisplayName ?? message.userId;
  const action = message.metadata.action === "joined" ? "joined" : "left";

  return (
    <View
      testID="channel-event-system-message"
      style={styles.container}
    >
      <Text style={styles.text}>
        <Text style={styles.senderName}>{senderName}</Text> {action} the channel
      </Text>
    </View>
  );
}
