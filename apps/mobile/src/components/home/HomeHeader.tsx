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
import Svg, { Path, Line } from "react-native-svg";

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FilterIcon({ color }: { color: string }) {
  return (
    <Svg testID="filter-icon" width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="6" x2="20" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="7" y1="12" x2="17" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="10" y1="18" x2="14" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function getInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

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
  const initial = workspace ? getInitial(workspace.name) : "?";

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
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{initial}</Text>
          </View>
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
          onPress={() => router.push(`/(app)/${workspaceSlug}/settings`)}
        />
      </View>
      {/* Search pill */}
      <Pressable
        testID="search-pill"
        onPress={() => setQuickSwitcherOpen(true)}
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
        <SearchIcon color={theme.colors.headerText} />
        <Text style={{ color: theme.colors.headerText, opacity: 0.7, marginLeft: 8, fontSize: 15, flex: 1 }}>
          Jump to or search...
        </Text>
        <FilterIcon color={theme.colors.headerText} />
      </Pressable>
      <QuickSwitcherModal visible={quickSwitcherOpen} onClose={() => setQuickSwitcherOpen(false)} />
    </View>
  );
}
