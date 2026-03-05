import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import Svg, { Path } from "react-native-svg";

function ChevronRight({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDown({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
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
      <View testID={`chevron-${collapsed ? "right" : "down"}`} style={{ width: 20, alignItems: "center" }}>
        {collapsed ? (
          <ChevronRight color={theme.colors.textFaint} />
        ) : (
          <ChevronDown color={theme.colors.textFaint} />
        )}
      </View>
    </Pressable>
  );
}
