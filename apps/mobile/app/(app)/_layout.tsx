import { Redirect, Stack, useGlobalSearchParams } from "expo-router";
import type { ChannelId } from "@openslaq/shared";
import { useAuth } from "@/contexts/AuthContext";
import { ChatStoreProvider, useChatStore } from "@/contexts/ChatStoreProvider";
import { HuddleProvider } from "@/contexts/HuddleProvider";
import { SocketProvider } from "@/contexts/SocketProvider";
import { ConnectionStatusBanner } from "@/components/ui/ConnectionStatusBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useVoipCallKit } from "@/hooks/useVoipCallKit";
import { useHuddle } from "@/contexts/HuddleProvider";
import { useApiDeps } from "@/hooks/useOperationDeps";

function PushNotificationSetup() {
  const { state } = useChatStore();
  const { joinHuddle } = useHuddle();
  const params = useGlobalSearchParams<{ workspaceSlug?: string }>();
  const deps = useApiDeps();

  const activeChannelId = (state.activeChannelId ?? state.activeDmId ?? null) as ChannelId | null;
  const workspaceSlug = params.workspaceSlug ?? null;

  usePushNotifications({
    deps,
    activeChannelId,
    workspaceSlug,
  });

  useVoipCallKit({
    deps,
    joinHuddle,
    huddleChannelId: state.currentHuddleChannelId as ChannelId | null,
    workspaceSlug,
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
          <ConnectionStatusBanner />
          <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: "minimal" }}>
            <Stack.Screen name="create-workspace" options={{ headerShown: true, title: "Create Workspace" }} />
            <Stack.Screen name="join-workspace" options={{ headerShown: true, title: "Join Workspace" }} />
          </Stack>
        </HuddleProvider>
      </SocketProvider>
    </ChatStoreProvider>
  );
}
