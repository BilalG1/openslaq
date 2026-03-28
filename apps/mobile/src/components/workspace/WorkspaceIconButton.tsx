import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import { useLocalSearchParams } from "expo-router";

import { WHITE } from "@/theme/constants";

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
      accessibilityRole="button"
      accessibilityLabel="Open workspace drawer"
      accessibilityHint="Opens the workspace switcher"
      onPress={toggle}
      hitSlop={8}
      style={styles.pressable}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.brand.primary }]}>
        <Text style={styles.initial}>
          {initial}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginLeft: 8,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
});
