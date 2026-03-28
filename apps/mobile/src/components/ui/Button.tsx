import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type TouchableOpacityProps } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "outline";

import { TRANSPARENT, WHITE } from "@/theme/constants";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export function Button({ label, variant = "primary", icon, style, ...props }: ButtonProps) {
  const { theme } = useMobileTheme();

  const backgroundColor = variant === "primary"
    ? theme.brand.primary
    : variant === "secondary"
      ? theme.colors.surfaceSecondary
      : TRANSPARENT;

  const textColor = variant === "primary" ? WHITE : theme.colors.textPrimary;
  const borderWidth = variant === "outline" ? 1 : 0;
  const borderColor = variant === "outline" ? theme.colors.borderStrong : TRANSPARENT;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderWidth, borderColor },
        style,
      ]}
      activeOpacity={0.85}
      {...props}
    >
      {icon && <View>{icon}</View>}
      <Text style={[styles.label, { color: textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
