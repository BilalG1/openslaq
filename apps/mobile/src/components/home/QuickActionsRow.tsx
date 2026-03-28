import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { MessageSquare, Headphones, Bookmark, Send, Folder } from "lucide-react-native";
import { routes } from "@/lib/routes";

interface QuickActionCardProps {
  testID: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  countUnit: "new" | "live" | "item";
  onPress?: () => void;
  theme: ReturnType<typeof useMobileTheme>["theme"];
  cardWidth: number;
}

function formatCount(count: number, unit: "new" | "live" | "item"): string | null {
  if (count === 0) return null;
  if (unit === "item") {
    return `${count} ${count === 1 ? "item" : "items"}`;
  }
  return `${count} ${unit}`;
}

function QuickActionCard({ testID, icon, label, count, countUnit, onPress, theme, cardWidth }: QuickActionCardProps) {
  return (
    <View
      style={[styles.cardContainer, { backgroundColor: theme.colors.surfaceTertiary, width: cardWidth }]}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={`Navigate to ${label}`}
        style={styles.cardPressable}
      >
        <View style={styles.iconWrapper}>{icon}</View>
        <Text style={[styles.cardLabel, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
        {formatCount(count, countUnit) != null && (
          <Text style={[styles.cardCount, { color: theme.colors.textMuted }]}>
            {formatCount(count, countUnit)}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export function QuickActionsRow() {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { width: screenWidth } = useWindowDimensions();

  const savedCount = state.savedMessageIds.length;
  const iconColor = theme.colors.textPrimary;
  // Show ~3.5 cards so the 4th peeks from the right edge
  const gap = 10;
  const paddingLeft = 16;
  const visibleCards = 4;
  const cardWidth = (screenWidth - paddingLeft - (visibleCards - 1) * gap) / visibleCards;

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.borderDefault }]}>
      <ScrollView
        testID="quick-actions-scroll"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <QuickActionCard
          testID="quick-action-threads"
          icon={<MessageSquare size={22} color={iconColor} strokeWidth={1.5} />}
          label="Threads"
          count={0}
          countUnit="new"
          onPress={() => router.push(routes.threads(workspaceSlug!))}
          theme={theme}
          cardWidth={cardWidth}
        />
        <QuickActionCard
          testID="quick-action-huddles"
          icon={<Headphones size={22} color={iconColor} strokeWidth={1.5} />}
          label="Huddles"
          count={Object.keys(state.activeHuddles).length}
          countUnit="live"
          onPress={() => router.push(routes.huddles(workspaceSlug!))}
          theme={theme}
          cardWidth={cardWidth}
        />
        <QuickActionCard
          testID="quick-action-later"
          icon={<Bookmark size={22} color={iconColor} strokeWidth={1.5} />}
          label="Later"
          count={savedCount}
          countUnit="item"
          onPress={() => router.push(routes.savedItems(workspaceSlug!))}
          theme={theme}
          cardWidth={cardWidth}
        />
        <QuickActionCard
          testID="quick-action-outbox"
          icon={<Send size={22} color={iconColor} strokeWidth={1.5} />}
          label="Outbox"
          count={0}
          countUnit="item"
          onPress={() => router.push(routes.outbox(workspaceSlug!))}
          theme={theme}
          cardWidth={cardWidth}
        />
        <QuickActionCard
          testID="quick-action-files"
          icon={<Folder size={22} color={iconColor} strokeWidth={1.5} />}
          label="Files"
          count={0}
          countUnit="item"
          onPress={() => router.push(routes.files(workspaceSlug!))}
          theme={theme}
          cardWidth={cardWidth}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  cardContainer: {
    borderRadius: 12,
    marginRight: 10,
    overflow: "hidden",
  },
  cardPressable: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWrapper: {
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardCount: {
    fontSize: 12,
    marginTop: 2,
  },
});
