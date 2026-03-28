import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  testID?: string;
}

export function EmptyState({ icon, message, testID }: EmptyStateProps) {
  const { theme } = useMobileTheme();

  return (
    <View testID={testID} style={styles.container}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={[styles.message, { color: theme.colors.textFaint }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  iconWrapper: {
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
  },
});
