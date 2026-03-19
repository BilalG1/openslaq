import { useMemo, useState } from "react";
import { Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { Channel } from "@openslaq/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { CreateChannelModal } from "@/components/CreateChannelModal";
import { NewDmModal } from "@/components/NewDmModal";
import { HomeActionsProvider } from "@/contexts/HomeActionsContext";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

export default function ChannelsLayout() {
  const { workspaceSlug: urlSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);

  const backButton = () => (
    <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" accessibilityHint="Navigates to the previous screen">
      <ChevronLeft size={28} color={theme.brand.primary} />
    </Pressable>
  );

  const workspaceSlug = state.workspaceSlug ?? urlSlug;

  const homeActions = useMemo(
    () => ({
      openCreateChannel: () => setShowCreate(true),
      openNewDm: () => setShowNewDm(true),
    }),
    [],
  );

  if (!workspaceSlug) return null;

  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdmin = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";
  const deps = { api, auth: authProvider, dispatch, getState: () => state };

  const handleChannelCreated = (channel: Channel) => {
    setShowCreate(false);
    router.push(routes.channel(workspaceSlug, channel.id));
  };

  const handleDmCreated = (channelId: string) => {
    setShowNewDm(false);
    router.push(routes.dm(workspaceSlug, channelId));
  };

  return (
    <HomeActionsProvider value={homeActions}>
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: "Home" }}
        />
        <Stack.Screen
          name="browse"
          options={{ title: "Browse Channels", headerLeft: backButton }}
        />
        <Stack.Screen
          name="[channelId]"
          options={{
            title: "",
            headerLeft: backButton,
            headerTitleContainerStyle: { justifyContent: "center" },
          }}
        />
        <Stack.Screen
          name="channel-members"
          options={{ title: "Members", headerLeft: backButton }}
        />
        <Stack.Screen
          name="dm/[channelId]"
          options={{ title: "", headerLeft: backButton }}
        />
      </Stack>
      <CreateChannelModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        workspaceSlug={workspaceSlug}
        canCreatePrivate={isAdmin}
        deps={deps}
        onCreated={handleChannelCreated}
      />
      <NewDmModal
        visible={showNewDm}
        onClose={() => setShowNewDm(false)}
        workspaceSlug={workspaceSlug}
        currentUserId={user?.id ?? ""}
        deps={deps}
        onCreated={handleDmCreated}
        onChannelSelected={(channelId) => {
          setShowNewDm(false);
          router.push(routes.channel(workspaceSlug, channelId));
        }}
      />
    </HomeActionsProvider>
  );
}
