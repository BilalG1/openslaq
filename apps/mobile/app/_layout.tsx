import "@/sentry";
import * as Sentry from "@sentry/react-native";
import { registerGlobals } from "@livekit/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { MobileThemeProvider, useMobileTheme } from "@/theme/ThemeProvider";

registerGlobals();

function ThemedAppShell() {
  const { mode } = useMobileTheme();

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

function RootLayout() {
  return (
    <MobileThemeProvider>
      <AuthContextProvider>
        <ThemedAppShell />
      </AuthContextProvider>
    </MobileThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
