import { Pressable, StyleSheet, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import type { SearchResultItem as SearchResult } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { formatRelativeTime } from "@/lib/time";
import { HeadlineRenderer } from "./HeadlineRenderer";

interface Props {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
}

function channelPrefixText(channelType: string): string | null {
  if (channelType === "private") return null;
  if (channelType === "dm") return null;
  return "# ";
}

export function SearchResultItem({ item, onPress }: Props) {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      testID={`search-result-${item.messageId}`}
      accessibilityRole="button"
      accessibilityLabel={`Message from ${item.userDisplayName} in ${item.channelName}`}
      accessibilityHint="Opens this message"
      onPress={() => onPress(item)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderDefault,
      })}
    >
      <View style={styles.headerRow}>
        <View
          testID="search-result-channel"
          style={styles.channelRow}
        >
          {item.channelType === "private" && <Lock size={13} color={theme.colors.textSecondary} style={styles.lockIcon} />}
          <Text
            style={[styles.channelName, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {channelPrefixText(item.channelType)}{item.channelName}
          </Text>
        </View>
        {item.parentMessageId && (
          <View
            testID="search-result-thread-badge"
            style={[styles.threadBadge, { backgroundColor: theme.brand.primary + "20" }]}
          >
            <Text style={[styles.threadBadgeText, { color: theme.brand.primary }]}>
              in thread
            </Text>
          </View>
        )}
        <Text style={[styles.timestamp, { color: theme.colors.textFaint }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      <Text
        testID="search-result-sender"
        style={[styles.senderName, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
      >
        {item.userDisplayName}
      </Text>
      <HeadlineRenderer headline={item.headline} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  lockIcon: {
    marginRight: 3,
  },
  channelName: {
    fontSize: 13,
    fontWeight: "600",
  },
  threadBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  threadBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
});
