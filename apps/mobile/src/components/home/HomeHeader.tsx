import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
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

  return (
    <View style={{ backgroundColor: theme.colors.headerBg }}>
      <StatusBar style="light" />
      {/* Top bar */}
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <WorkspaceIconButton />
          <Text
            testID="home-header-workspace-name"
            style={{ color: theme.colors.headerText, fontSize: 18, fontWeight: "700" }}
          >
            {workspaceName}
          </Text>
        </View>
        <HeaderAvatarButton
          avatarUrl={profile?.avatarUrl}
          displayName={profile?.displayName}
          onPress={() => router.push(routes.settings(workspaceSlug!))}
        />
      </View>
      {/* Search pill */}
      <Pressable
        testID="search-pill"
        onPress={() => router.push(routes.search(workspaceSlug!))}
        style={{
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: theme.colors.headerSearchBg,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Search size={16} color={theme.colors.headerText} />
        <Text style={{ color: theme.colors.headerText, opacity: 0.7, marginLeft: 8, fontSize: 15, flex: 1 }}>
          Jump to or search...
        </Text>
        <SlidersHorizontal testID="filter-icon" size={16} color={theme.colors.headerText} />
      </Pressable>
      <QuickSwitcherModal visible={quickSwitcherOpen} onClose={() => setQuickSwitcherOpen(false)} />
    </View>
  );
}
