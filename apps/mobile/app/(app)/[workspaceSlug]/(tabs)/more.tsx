import { Text, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/ThemeProvider";
import {
  FolderOpen,
  Bookmark,
  Send,
  Settings,
  ChevronRight,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { routes } from "@/lib/routes";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}

export default function MoreScreen() {
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  const items: MenuItem[] = [
    {
      label: "Files",
      icon: FolderOpen,
      onPress: () => router.push(routes.files(workspaceSlug)),
    },
    {
      label: "Saved Items",
      icon: Bookmark,
      onPress: () => router.push(routes.savedItems(workspaceSlug)),
    },
    {
      label: "Outbox",
      icon: Send,
      onPress: () => router.push(routes.outbox(workspaceSlug)),
    },
    {
      label: "Settings",
      icon: Settings,
      onPress: () => router.push(routes.settings(workspaceSlug)),
    },
  ];

  return (
    <ScrollView
      testID="more-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: theme.colors.textPrimary,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        More
      </Text>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pressed
                ? theme.colors.surfaceHover
                : theme.colors.surface,
            })}
          >
            <Icon size={20} color={theme.colors.textSecondary} />
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.textPrimary,
                flex: 1,
                marginLeft: 12,
              }}
            >
              {item.label}
            </Text>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
