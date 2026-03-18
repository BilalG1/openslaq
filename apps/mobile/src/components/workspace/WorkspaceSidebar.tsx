import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Settings } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import type { WorkspaceInfo } from "@openslaq/client-core";
import { routes } from "@/lib/routes";

function getInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function WorkspaceCard({
  workspace,
  isActive,
  onPress,
}: {
  workspace: WorkspaceInfo;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      testID={`workspace-card-${workspace.name}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 12,
        backgroundColor: isActive ? theme.brand.primary + "18" : "transparent",
        borderWidth: isActive ? 1.5 : 0,
        borderColor: isActive ? theme.brand.primary : "transparent",
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: isActive ? theme.brand.primary : theme.colors.surfaceTertiary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: isActive ? "#fff" : theme.colors.textPrimary,
            fontSize: 20,
            fontWeight: "700",
          }}
        >
          {getInitial(workspace.name)}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.textPrimary,
          }}
        >
          {workspace.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
          {workspace.memberCount != null && (
            <Text
              style={{
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              {workspace.memberCount} {workspace.memberCount === 1 ? "member" : "members"}
            </Text>
          )}
          {workspace.memberCount != null && (
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginHorizontal: 6 }}>
              ·
            </Text>
          )}
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 4,
              backgroundColor: theme.colors.surfaceTertiary,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "500", color: theme.colors.textSecondary }}>
              {formatRole(workspace.role)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

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
      router.replace(routes.channels(slug));
    }
  };

  const handleCreate = () => {
    close();
    router.push("/(app)/create-workspace");
  };

  const handleSettings = () => {
    close();
    router.push(routes.workspaceSettings(workspaceSlug!));
  };

  return (
    <View
      testID="workspace-sidebar"
      style={{
        flex: 1,
        backgroundColor: theme.colors.surfaceSecondary,
        paddingTop: 12,
        paddingBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: theme.colors.textPrimary,
          paddingHorizontal: 20,
          paddingVertical: 8,
        }}
      >
        Workspaces
      </Text>

      <FlatList
        data={state.workspaces}
        keyExtractor={(ws) => ws.slug}
        renderItem={({ item: ws }) => (
          <WorkspaceCard
            workspace={ws}
            isActive={ws.slug === workspaceSlug}
            onPress={() => handleSelect(ws.slug)}
          />
        )}
        style={{ flex: 1 }}
      />

      {isAdminOrOwner && (
        <Pressable
          testID="workspace-settings-button"
          onPress={handleSettings}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 10,
            marginHorizontal: 8,
            borderRadius: 10,
            backgroundColor: theme.colors.surfaceTertiary,
            marginBottom: 6,
          }}
        >
          <Settings size={18} color={theme.colors.textSecondary} />
          <Text style={{ fontSize: 15, color: theme.colors.textSecondary, marginLeft: 10 }}>
            Settings
          </Text>
        </Pressable>
      )}

      <Pressable
        testID="workspace-add-button"
        onPress={handleCreate}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 10,
          marginHorizontal: 8,
          borderRadius: 10,
          backgroundColor: theme.colors.surfaceTertiary,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "300",
            color: theme.colors.textSecondary,
          }}
        >
          +
        </Text>
        <Text style={{ fontSize: 15, color: theme.colors.textSecondary, marginLeft: 10 }}>
          Create workspace
        </Text>
      </Pressable>
    </View>
  );
}
