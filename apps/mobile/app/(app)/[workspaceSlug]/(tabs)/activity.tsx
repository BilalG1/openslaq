import { View, Text, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";

export default function ActivityScreen() {
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);

  return (
    <View
      testID="activity-screen"
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <Text style={styles.heading}>Activity</Text>
      <View style={styles.emptyState}>
        <Bell size={40} color={theme.colors.textFaint} style={styles.icon} />
        <Text style={styles.title}>
          No new activity
        </Text>
        <Text style={styles.subtitle}>
          Mentions and reactions will appear here
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    heading: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
  });
