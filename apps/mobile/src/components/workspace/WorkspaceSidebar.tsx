import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useServer } from "@/contexts/ServerContext";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import type { WorkspaceInfo } from "@openslaq/client-core";
import { routes } from "@/lib/routes";
import { useWorkspaceParams } from "@/hooks/useRouteParams";

import { TRANSPARENT, WHITE } from "@/theme/constants";

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
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${workspace.name}`}
      accessibilityHint="Switches to this workspace"
      onPress={onPress}
      style={[
        isActive ? styles.cardContainerActive : styles.cardContainer,
        {
          backgroundColor: isActive ? theme.brand.primary + "18" : TRANSPARENT,
          borderColor: isActive ? theme.brand.primary : TRANSPARENT,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.cardIcon,
          { backgroundColor: isActive ? theme.brand.primary : theme.colors.surfaceTertiary },
        ]}
      >
        <Text
          style={[
            styles.cardInitial,
            { color: isActive ? WHITE : theme.colors.textPrimary },
          ]}
        >
          {getInitial(workspace.name)}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text
          numberOfLines={1}
          style={[styles.cardName, { color: theme.colors.textPrimary }]}
        >
          {workspace.name}
        </Text>
        <View style={styles.cardMeta}>
          {workspace.memberCount != null && (
            <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>
              {workspace.memberCount} {workspace.memberCount === 1 ? "member" : "members"}
            </Text>
          )}
          {workspace.memberCount != null && (
            <Text style={[styles.cardDivider, { color: theme.colors.textSecondary }]}>
              ·
            </Text>
          )}
          <View
            style={[styles.rolePill, { backgroundColor: theme.colors.surfaceTertiary }]}
          >
            <Text style={[styles.roleText, { color: theme.colors.textSecondary }]}>
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
  const { activeServer, isCloudServer } = useServer();
  const router = useRouter();
  const { workspaceSlug } = useWorkspaceParams();
  const insets = useSafeAreaInsets();

  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdminOrOwner =
    currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";

  const handleSelect = (slug: string) => {
    close();
    if (slug !== workspaceSlug) {
      router.replace(routes.channels(slug));
    }
  };

  const handleAdd = () => {
    close();
    Alert.alert("Add Workspace", undefined, [
      { text: "Join a Workspace", onPress: () => router.push("/(app)/join-workspace") },
      { text: "Create a Workspace", onPress: () => router.push("/(app)/create-workspace") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSettings = () => {
    close();
    router.push(routes.workspaceSettings(workspaceSlug!));
  };

  return (
    <View testID="workspace-sidebar" style={[styles.sidebar, { backgroundColor: theme.colors.surfaceSecondary, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={[styles.sidebarTitle, { color: theme.colors.textPrimary }]}>
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
        style={styles.list}
      />

      {isAdminOrOwner && (
        <Pressable
          testID="workspace-settings-button"
          accessibilityRole="button"
          accessibilityLabel="Workspace settings"
          accessibilityHint="Opens workspace settings"
          onPress={handleSettings}
          style={[styles.bottomButton, { backgroundColor: theme.colors.surfaceTertiary }]}
        >
          <Settings size={18} color={theme.colors.textSecondary} />
          <Text style={[styles.bottomButtonText, { color: theme.colors.textSecondary }]}>
            Settings
          </Text>
        </Pressable>
      )}

      <Pressable
        testID="workspace-add-button"
        accessibilityRole="button"
        accessibilityLabel="Add workspace"
        accessibilityHint="Shows options to join or create a workspace"
        onPress={handleAdd}
        style={[styles.bottomButtonLast, { backgroundColor: theme.colors.surfaceTertiary }]}
      >
        <Text style={[styles.plusIcon, { color: theme.colors.textSecondary }]}>
          +
        </Text>
        <Text style={[styles.bottomButtonText, { color: theme.colors.textSecondary }]}>
          Add workspace
        </Text>
      </Pressable>

      {/* Server indicator — only shown for non-cloud servers */}
      {!isCloudServer && (
        <View style={[styles.serverIndicator, { backgroundColor: theme.colors.surfaceTertiary }]}>
          <Text style={[styles.serverName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {activeServer.name}
          </Text>
          <Text style={[styles.serverUrl, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {activeServer.url.replace(/^https?:\/\//, "")}
          </Text>
          <Pressable
            testID="switch-server-button"
            onPress={() => {
              close();
              router.replace("/(auth)/sign-in");
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch server"
            accessibilityHint="Returns to sign-in to change server"
          >
            <Text style={[styles.switchServerText, { color: theme.brand.primary }]}>
              Switch server
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  list: {
    flex: 1,
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 0,
  },
  cardContainerActive: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInitial: {
    fontSize: 20,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  cardMetaText: {
    fontSize: 13,
  },
  cardDivider: {
    fontSize: 13,
    marginHorizontal: 6,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "500",
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  bottomButtonLast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  bottomButtonText: {
    fontSize: 15,
    marginLeft: 10,
  },
  plusIcon: {
    fontSize: 22,
    fontWeight: "300",
  },
  serverIndicator: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    gap: 2,
  },
  serverName: {
    fontSize: 13,
    fontWeight: "600",
  },
  serverUrl: {
    fontSize: 11,
  },
  switchServerText: {
    fontSize: 13,
    marginTop: 4,
  },
});
