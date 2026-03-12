import { Pressable, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import type { SearchResultItem as SearchResult } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { HeadlineRenderer } from "./HeadlineRenderer";

interface Props {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  return date.toLocaleDateString();
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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        <View
          testID="search-result-channel"
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        >
          {item.channelType === "private" && <Lock size={13} color={theme.colors.textSecondary} style={{ marginRight: 3 }} />}
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary }}
            numberOfLines={1}
          >
            {channelPrefixText(item.channelType)}{item.channelName}
          </Text>
        </View>
        {item.parentMessageId && (
          <View
            testID="search-result-thread-badge"
            style={{
              backgroundColor: theme.brand.primary + "20",
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginLeft: 8,
            }}
          >
            <Text style={{ fontSize: 11, color: theme.brand.primary, fontWeight: "500" }}>
              in thread
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginLeft: 8 }}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      <Text
        testID="search-result-sender"
        style={{ fontSize: 14, fontWeight: "500", color: theme.colors.textPrimary, marginBottom: 2 }}
        numberOfLines={1}
      >
        {item.userDisplayName}
      </Text>
      <HeadlineRenderer headline={item.headline} />
    </Pressable>
  );
}
