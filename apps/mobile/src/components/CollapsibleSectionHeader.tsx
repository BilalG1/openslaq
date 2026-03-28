import { useMemo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
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

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 14,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.borderDefault,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    count: {
      fontSize: 13,
      color: theme.colors.textFaint,
      marginRight: 8,
    },
    chevronContainer: {
      width: 20,
      alignItems: "center",
    },
  });

export function CollapsibleSectionHeader({
  sectionKey,
  title,
  collapsed,
  onToggle,
  count,
}: CollapsibleSectionHeaderProps) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      testID={`section-header-${sectionKey}`}
      onPress={() => { haptics.light(); onToggle(); }}
      accessibilityLabel={`${title} section, ${collapsed ? "collapsed" : "expanded"}`}
      accessibilityHint={collapsed ? "Expands this section" : "Collapses this section"}
      style={styles.container}
    >
      <Text style={styles.title}>
        {title}
      </Text>
      {count != null && (
        <Text style={styles.count}>
          ({count})
        </Text>
      )}
      <View
        testID={`chevron-${collapsed ? "right" : "down"}`}
        style={[
          styles.chevronContainer,
          { transform: [{ rotate: collapsed ? "-90deg" : "0deg" }] },
        ]}
      >
        <ChevronDown size={14} color={theme.colors.textFaint} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}
