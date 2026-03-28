import { Stack } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function DmsLayout() {
  const { theme } = useMobileTheme();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: theme.colors.surface },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { color: theme.colors.textPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Direct Messages" }} />
    </Stack>
  );
}
