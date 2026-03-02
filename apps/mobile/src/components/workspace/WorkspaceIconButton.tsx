import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import { useLocalSearchParams } from "expo-router";

function getInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export function WorkspaceIconButton() {
  const { theme } = useMobileTheme();
  const { state } = useChatStore();
  const { toggle } = useWorkspaceDrawer();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  const workspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const initial = workspace ? getInitial(workspace.name) : "?";

  return (
    <Pressable
      testID="workspace-icon-button"
      onPress={toggle}
      hitSlop={8}
      style={{ marginLeft: 8 }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: theme.brand.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
          {initial}
        </Text>
      </View>
    </Pressable>
  );
}
