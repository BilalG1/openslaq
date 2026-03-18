import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { ChevronDown } from "lucide-react-native";

interface CollapsibleSectionHeaderProps {
  sectionKey: string;
  title: string;
  icon?: string;
  collapsed: boolean;
  onToggle: () => void;
  count?: number;
}

export function CollapsibleSectionHeader({
  sectionKey,
  title,
  collapsed,
  onToggle,
  count,
}: CollapsibleSectionHeaderProps) {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      testID={`section-header-${sectionKey}`}
      onPress={() => { haptics.light(); onToggle(); }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 14,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 0.5,
        borderTopColor: theme.colors.borderDefault,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "600",
          color: theme.colors.textSecondary,
        }}
      >
        {title}
      </Text>
      {count != null && (
        <Text style={{ fontSize: 13, color: theme.colors.textFaint, marginRight: 8 }}>
          ({count})
        </Text>
      )}
      <View
        testID={`chevron-${collapsed ? "right" : "down"}`}
        style={{
          width: 20,
          alignItems: "center",
          transform: [{ rotate: collapsed ? "-90deg" : "0deg" }],
        }}
      >
        <ChevronDown size={14} color={theme.colors.textFaint} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}
