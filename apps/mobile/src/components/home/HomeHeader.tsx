import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { HeaderAvatarButton } from "@/components/HeaderAvatarButton";
import { QuickSwitcherModal } from "@/components/QuickSwitcherModal";
import { WorkspaceIconButton } from "@/components/workspace/WorkspaceIconButton";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { routes } from "@/lib/routes";
import { getActiveStatusEmoji } from "@/utils/message-list-utils";

export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const { state } = useChatStore();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { profile } = useCurrentUserProfile();
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  const workspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const workspaceName = workspace?.name ?? "Home";
  const statusEmoji = profile?.id ? getActiveStatusEmoji(state.presence[profile.id]) : null;

  return (
    <View style={{ backgroundColor: theme.colors.headerBg }}>
      {/* Top bar */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.leftGroup}>
          <WorkspaceIconButton />
          <Text
            testID="home-header-workspace-name"
            style={[styles.workspaceName, { color: theme.colors.headerText }]}
          >
            {workspaceName}
          </Text>
        </View>
        <HeaderAvatarButton
          avatarUrl={profile?.avatarUrl}
          displayName={profile?.displayName}
          statusEmoji={statusEmoji}
          onPress={() => router.push(routes.settings(workspaceSlug!))}
        />
      </View>
      {/* Search pill */}
      <Pressable
        testID="search-pill"
        accessibilityRole="search"
        accessibilityLabel="Search messages"
        accessibilityHint="Opens the search screen"
        onPress={() => router.push(routes.search(workspaceSlug!))}
        style={[styles.searchPill, { backgroundColor: theme.colors.headerSearchBg }]}
      >
        <Search size={16} color={theme.colors.headerText} />
        <Text style={[styles.searchText, { color: theme.colors.headerText }]}>
          Jump to or search...
        </Text>
        <SlidersHorizontal testID="filter-icon" size={16} color={theme.colors.headerText} />
      </Pressable>
      <QuickSwitcherModal visible={quickSwitcherOpen} onClose={() => setQuickSwitcherOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  workspaceName: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  searchPill: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  searchText: {
    opacity: 0.7,
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },
});
