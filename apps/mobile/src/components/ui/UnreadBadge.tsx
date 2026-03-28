import { View, Text, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface UnreadBadgeProps {
  count: number;
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  const { theme } = useMobileTheme();

  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: theme.interaction.badgeUnreadBg }]}>
      <Text style={[styles.badgeText, { color: theme.interaction.badgeUnreadText }]}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
