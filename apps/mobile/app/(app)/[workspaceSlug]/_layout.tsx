import { Pressable, View, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { WorkspaceBootstrapProvider } from "@/contexts/WorkspaceBootstrapProvider";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import { WorkspaceDrawerProvider } from "@/contexts/WorkspaceDrawerContext";
import { WorkspaceDrawer } from "@/components/workspace/WorkspaceDrawer";
import { HuddleFloatingBar } from "@/components/huddle/HuddleFloatingBar";
import { useWorkspaceParams } from "@/hooks/useRouteParams";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function WorkspaceLayout() {
  const { workspaceSlug } = useWorkspaceParams();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const backButton = () => (
    <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" accessibilityHint="Navigates to the previous screen">
      <ChevronLeft size={28} color={theme.brand.primary} />
    </Pressable>
  );

  return (
    <WorkspaceBootstrapProvider workspaceSlug={workspaceSlug!}>
      <FeatureFlagsProvider>
      <WorkspaceDrawerProvider>
        <WorkspaceDrawer>
          <View style={styles.flex}>
            <Stack
              screenOptions={{
                headerShown: false,
                headerBackButtonDisplayMode: "minimal",
                contentStyle: { backgroundColor: theme.colors.surface },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="search"
                options={{
                  headerShown: false,
                  title: "Search",
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="thread/[parentMessageId]"
                options={{
                  headerShown: true,
                  title: "Thread",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="profile/[userId]"
                options={{
                  headerShown: true,
                  title: "Profile",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: true,
                  title: "Settings",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="workspace-settings"
                options={{
                  headerShown: true,
                  title: "Workspace Settings",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="notification-settings"
                options={{
                  headerShown: true,
                  title: "Notifications",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="preferences"
                options={{
                  headerShown: true,
                  title: "Preferences",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="scheduled-messages"
                options={{
                  headerShown: true,
                  title: "Scheduled Messages",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="saved-items"
                options={{
                  headerShown: true,
                  title: "Saved Items",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="threads"
                options={{
                  headerShown: true,
                  title: "Threads",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="files"
                options={{
                  headerShown: true,
                  title: "Files",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="outbox"
                options={{
                  headerShown: true,
                  title: "Outbox",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="huddles"
                options={{
                  headerShown: true,
                  title: "Huddles",
                  headerLeft: backButton,
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.brand.primary,
                }}
              />
              <Stack.Screen
                name="huddle"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                  headerShown: false,
                  title: "Huddle",
                }}
              />
            </Stack>
            <HuddleFloatingBar />
          </View>
        </WorkspaceDrawer>
      </WorkspaceDrawerProvider>
      </FeatureFlagsProvider>
    </WorkspaceBootstrapProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
