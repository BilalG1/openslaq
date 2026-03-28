import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { ReactNode } from "react";

interface ListRowProps extends PressableProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function ListRow({ children, style, ...props }: ListRowProps) {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
        ...style,
      })}
    >
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
});
