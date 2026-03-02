import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { WorkspaceBootstrapProvider } from "@/contexts/WorkspaceBootstrapProvider";
import { WorkspaceDrawerProvider } from "@/contexts/WorkspaceDrawerContext";
import { WorkspaceDrawer } from "@/components/workspace/WorkspaceDrawer";
import { HuddleFloatingBar } from "@/components/huddle/HuddleFloatingBar";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function WorkspaceLayout() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { theme } = useMobileTheme();

  return (
    <WorkspaceBootstrapProvider workspaceSlug={workspaceSlug}>
      <WorkspaceDrawerProvider>
        <WorkspaceDrawer>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.surface },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="search"
                options={{
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="thread/[parentMessageId]"
                options={{
                  headerShown: true,
                  title: "Thread",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="profile/[userId]"
                options={{
                  headerShown: true,
                  title: "Profile",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: true,
                  title: "Settings",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="workspace-settings"
                options={{
                  headerShown: true,
                  title: "Workspace Settings",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="notification-settings"
                options={{
                  headerShown: true,
                  title: "Notifications",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="preferences"
                options={{
                  headerShown: true,
                  title: "Preferences",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="saved-items"
                options={{
                  headerShown: true,
                  title: "Saved Items",
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.textPrimary,
                }}
              />
              <Stack.Screen
                name="huddle"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                  headerShown: false,
                }}
              />
            </Stack>
            <HuddleFloatingBar />
          </View>
        </WorkspaceDrawer>
      </WorkspaceDrawerProvider>
    </WorkspaceBootstrapProvider>
  );
}
