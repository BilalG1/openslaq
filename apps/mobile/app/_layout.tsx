import "@/sentry";
import * as Sentry from "@sentry/react-native";
import { registerGlobals } from "@livekit/react-native";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { ServerProvider } from "@/contexts/ServerContext";
import { MobileThemeProvider } from "@/theme/ThemeProvider";
import { useStatusBar } from "@/hooks/useStatusBar";

LogBox.ignoreAllLogs();
registerGlobals();

function ThemedAppShell() {
  useStatusBar();

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayout() {
  return (
    <KeyboardProvider>
      <MobileThemeProvider>
        <ServerProvider>
          <AuthContextProvider>
            <ThemedAppShell />
          </AuthContextProvider>
        </ServerProvider>
      </MobileThemeProvider>
    </KeyboardProvider>
  );
}

export default RootLayout;
