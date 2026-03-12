import { View, Text } from "react-native";
import { Bell } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function ActivityScreen() {
  const { theme } = useMobileTheme();

  return (
    <View
      testID="activity-screen"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surface,
      }}
    >
      <Bell size={40} color={theme.colors.textFaint} style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary }}>
        No new activity
      </Text>
      <Text style={{ fontSize: 14, color: theme.colors.textMuted, marginTop: 4 }}>
        Mentions and reactions will appear here
      </Text>
    </View>
  );
}
