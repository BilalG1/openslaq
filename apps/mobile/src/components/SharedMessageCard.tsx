import { View, Text, StyleSheet } from "react-native";
import type { SharedMessageInfo } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { MessageContent } from "./MessageContent";
import { formatTime } from "@/lib/time";

interface Props {
  sharedMessage: SharedMessageInfo;
}

export function SharedMessageCard({ sharedMessage }: Props) {
  const { theme } = useMobileTheme();
  const displayName = sharedMessage.senderDisplayName || "Unknown";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View
      testID="shared-message-card"
      style={[styles.container, {
        borderLeftColor: theme.brand.primary,
        backgroundColor: theme.colors.surfaceSecondary,
      }]}
    >
      <View style={styles.headerRow}>
        <View
          testID="shared-message-avatar"
          style={[styles.avatar, { backgroundColor: theme.colors.surfaceTertiary }]}
        >
          <Text style={[styles.avatarText, { color: theme.colors.textMuted }]}>
            {initial}
          </Text>
        </View>
        <Text style={[styles.senderName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.channelLabel, { color: theme.colors.textFaint }]} numberOfLines={1}>
          in {sharedMessage.channelType === "public" || sharedMessage.channelType === "private"
            ? `#${sharedMessage.channelName}`
            : sharedMessage.channelName}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.textFaint }]}>
          {formatTime(sharedMessage.createdAt)}
        </Text>
      </View>
      <MessageContent content={sharedMessage.content} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "600",
  },
  senderName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  channelLabel: {
    flexShrink: 1,
    fontSize: 12,
    marginLeft: 4,
  },
  timeText: {
    fontSize: 11,
    marginLeft: 6,
  },
});
