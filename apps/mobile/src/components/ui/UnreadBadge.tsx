import { View, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface UnreadBadgeProps {
  count: number;
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const { theme } = useMobileTheme();

  return (
    <View
      style={{
        borderRadius: 9999,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.interaction.badgeUnreadBg,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: theme.interaction.badgeUnreadText,
        }}
      >
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
