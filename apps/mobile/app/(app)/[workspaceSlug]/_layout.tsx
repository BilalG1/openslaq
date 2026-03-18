import { Pressable, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { WorkspaceBootstrapProvider } from "@/contexts/WorkspaceBootstrapProvider";
import { WorkspaceDrawerProvider } from "@/contexts/WorkspaceDrawerContext";
import { WorkspaceDrawer } from "@/components/workspace/WorkspaceDrawer";
import { HuddleFloatingBar } from "@/components/huddle/HuddleFloatingBar";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function WorkspaceLayout() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { theme } = useMobileTheme();
  const router = useRouter();

  const backButton = () => (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <ChevronLeft size={28} color={theme.brand.primary} />
    </Pressable>
  );

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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
                  headerBackTitle: "",
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
