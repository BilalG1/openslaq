import { View, ActivityIndicator } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface LoadingScreenProps {
  testID?: string;
}

export function LoadingScreen({ testID }: LoadingScreenProps) {
  const { theme } = useMobileTheme();

  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surface,
      }}
    >
      <ActivityIndicator size="large" color={theme.brand.primary} />
    </View>
  );
}
