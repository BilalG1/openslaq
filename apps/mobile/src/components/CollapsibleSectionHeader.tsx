import { Pressable, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface CollapsibleSectionHeaderProps {
  sectionKey: string;
  title: string;
  icon: string;
  collapsed: boolean;
  onToggle: () => void;
  count?: number;
}

export function CollapsibleSectionHeader({
  sectionKey,
  title,
  icon,
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
        paddingVertical: 6,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Text style={{ fontSize: 13, marginRight: 4, color: theme.colors.textFaint }}>
        {collapsed ? "\u25B8" : "\u25BE"}
      </Text>
      <Text style={{ fontSize: 13, marginRight: 4, color: theme.colors.textFaint }}>
        {icon}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: theme.colors.textFaint,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      {count != null && (
        <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginLeft: 6 }}>
          ({count})
        </Text>
      )}
    </Pressable>
  );
}
