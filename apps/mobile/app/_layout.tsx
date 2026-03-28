import "@/sentry";
import * as Sentry from "@sentry/react-native";
import { registerGlobals } from "@livekit/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { ServerProvider } from "@/contexts/ServerContext";
import { MobileThemeProvider, useMobileTheme } from "@/theme/ThemeProvider";

LogBox.ignoreAllLogs();
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
      <ServerProvider>
        <AuthContextProvider>
          <ThemedAppShell />
        </AuthContextProvider>
      </ServerProvider>
    </MobileThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
