import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import Svg, { Path } from "react-native-svg";

function ChevronDown({ color, size = 14 }: { color: string; size?: number }) {
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
      onPress={() => { haptics.light(); onToggle(); }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
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
        <ChevronDown color={theme.colors.textFaint} />
      </View>
    </Pressable>
  );
}
