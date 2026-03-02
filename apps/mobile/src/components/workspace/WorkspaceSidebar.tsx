import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import { WorkspaceIcon } from "./WorkspaceIcon";

export function WorkspaceSidebar() {
  const { theme } = useMobileTheme();
  const { state } = useChatStore();
  const { close } = useWorkspaceDrawer();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdminOrOwner =
    currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";

  const handleSelect = (slug: string) => {
    close();
    if (slug !== workspaceSlug) {
      router.replace(`/(app)/${slug}/(channels)`);
    }
  };

  const handleCreate = () => {
    close();
    router.push("/(app)/create-workspace");
  };

  const handleSettings = () => {
    close();
    router.push(`/(app)/${workspaceSlug}/workspace-settings`);
  };

  return (
    <View
      testID="workspace-sidebar"
      style={{
        flex: 1,
        backgroundColor: theme.colors.surfaceSecondary,
        paddingVertical: 12,
        alignItems: "center",
      }}
    >
      <FlatList
        data={state.workspaces}
        keyExtractor={(ws) => ws.slug}
        renderItem={({ item: ws }) => (
          <WorkspaceIcon
            name={ws.name}
            isActive={ws.slug === workspaceSlug}
            onPress={() => handleSelect(ws.slug)}
          />
        )}
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{ alignItems: "center" }}
      />

      {isAdminOrOwner && (
        <Pressable
          testID="workspace-settings-button"
          onPress={handleSettings}
          hitSlop={8}
          style={{ marginBottom: 8 }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: theme.colors.surfaceTertiary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>{"\u2699\uFE0F"}</Text>
          </View>
        </Pressable>
      )}

      <Pressable
        testID="workspace-add-button"
        onPress={handleCreate}
        hitSlop={8}
        style={{ marginBottom: 4 }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: theme.colors.surfaceTertiary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "300",
              color: theme.colors.textSecondary,
            }}
          >
            +
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
