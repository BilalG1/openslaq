import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  testID?: string;
}

export function EmptyState({ icon, message, testID }: EmptyStateProps) {
  const { theme } = useMobileTheme();

  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
      }}
    >
      {icon && <View style={{ marginBottom: 12 }}>{icon}</View>}
      <Text style={{ fontSize: 16, color: theme.colors.textFaint }}>
        {message}
      </Text>
    </View>
  );
}
