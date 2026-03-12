import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Channel } from "@openslaq/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { CreateChannelModal } from "@/components/CreateChannelModal";
import { NewDmModal } from "@/components/NewDmModal";
import { HomeActionsProvider } from "@/contexts/HomeActionsContext";
import { api } from "@/lib/api";

export default function ChannelsLayout() {
  const { workspaceSlug: urlSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);

  const workspaceSlug = state.workspaceSlug ?? urlSlug;
  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdmin = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";
  const deps = { api, auth: authProvider, dispatch, getState: () => state };

  const handleChannelCreated = (channel: Channel) => {
    setShowCreate(false);
    router.push(`/(app)/${workspaceSlug}/(channels)/${channel.id}`);
  };

  const handleDmCreated = (channelId: string) => {
    setShowNewDm(false);
    router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${channelId}`);
  };

  const homeActions = useMemo(
    () => ({
      openCreateChannel: () => setShowCreate(true),
      openNewDm: () => setShowNewDm(true),
    }),
    [],
  );

  return (
    <HomeActionsProvider value={homeActions}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="browse"
          options={{ title: "Browse Channels", headerBackTitle: "" }}
        />
        <Stack.Screen
          name="[channelId]"
          options={{ title: "", headerBackTitle: "" }}
        />
        <Stack.Screen
          name="channel-members"
          options={{ title: "Members", headerBackTitle: "" }}
        />
        <Stack.Screen
          name="dm/[channelId]"
          options={{ title: "", headerBackTitle: "" }}
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
      />
    </HomeActionsProvider>
  );
}
