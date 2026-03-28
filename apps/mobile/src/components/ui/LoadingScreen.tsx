import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface LoadingScreenProps {
  testID?: string;
}

export function LoadingScreen({ testID }: LoadingScreenProps) {
  const { theme } = useMobileTheme();

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ActivityIndicator size="large" color={theme.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
