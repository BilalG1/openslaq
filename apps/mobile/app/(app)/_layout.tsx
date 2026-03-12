import { Redirect, Stack, useGlobalSearchParams } from "expo-router";
import type { ChannelId } from "@openslaq/shared";
import { useAuth } from "@/contexts/AuthContext";
import { ChatStoreProvider, useChatStore } from "@/contexts/ChatStoreProvider";
import { HuddleProvider } from "@/contexts/HuddleProvider";
import { SocketProvider } from "@/contexts/SocketProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { api } from "@/lib/api";

function PushNotificationSetup() {
  const { authProvider } = useAuth();
  const { state } = useChatStore();
  const params = useGlobalSearchParams<{ workspaceSlug?: string }>();

  const activeChannelId = (state.activeChannelId ?? state.activeDmId ?? null) as ChannelId | null;

  usePushNotifications({
    deps: { api, auth: authProvider },
    activeChannelId,
    workspaceSlug: params.workspaceSlug ?? null,
  });

  return null;
}

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;

  return (
    <ChatStoreProvider>
      <SocketProvider>
        <HuddleProvider>
          <PushNotificationSetup />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="create-workspace" options={{ headerShown: true, title: "Create Workspace", headerBackTitle: "" }} />
          </Stack>
        </HuddleProvider>
      </SocketProvider>
    </ChatStoreProvider>
  );
}
