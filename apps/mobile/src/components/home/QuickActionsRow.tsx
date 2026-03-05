import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import Svg, { Path } from "react-native-svg";

function ThreadsIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HuddlesIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18v-6a9 9 0 0118 0v6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LaterIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DraftsIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface QuickActionCardProps {
  testID: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  countUnit: "new" | "live" | "item";
  onPress?: () => void;
  theme: ReturnType<typeof useMobileTheme>["theme"];
}

function formatCount(count: number, unit: "new" | "live" | "item"): string {
  if (unit === "item") {
    return `${count} ${count === 1 ? "item" : "items"}`;
  }
  return `${count} ${unit}`;
}

function QuickActionCard({ testID, icon, label, count, countUnit, onPress, theme }: QuickActionCardProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: theme.colors.borderDefault,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginRight: 10,
        minWidth: 100,
      })}
    >
      <View style={{ marginBottom: 4 }}>{icon}</View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
        {formatCount(count, countUnit)}
      </Text>
    </Pressable>
  );
}

export function QuickActionsRow() {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();

  const savedCount = state.savedMessageIds.length;
  const iconColor = theme.colors.textSecondary;

  return (
    <View style={{ paddingVertical: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <QuickActionCard
          testID="quick-action-threads"
          icon={<ThreadsIcon color={iconColor} />}
          label="Threads"
          count={0}
          countUnit="new"
          theme={theme}
        />
        <QuickActionCard
          testID="quick-action-huddles"
          icon={<HuddlesIcon color={iconColor} />}
          label="Huddles"
          count={0}
          countUnit="live"
          theme={theme}
        />
        <QuickActionCard
          testID="quick-action-later"
          icon={<LaterIcon color={iconColor} />}
          label="Later"
          count={savedCount}
          countUnit="item"
          onPress={() => router.push(`/(app)/${workspaceSlug}/saved-items`)}
          theme={theme}
        />
        <QuickActionCard
          testID="quick-action-drafts"
          icon={<DraftsIcon color={iconColor} />}
          label="Drafts"
          count={0}
          countUnit="item"
          theme={theme}
        />
      </ScrollView>
    </View>
  );
}
