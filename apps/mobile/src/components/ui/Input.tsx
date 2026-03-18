import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

export const Input = forwardRef<TextInput, TextInputProps>(
  function Input({ style, placeholderTextColor, ...props }, ref) {
    const { theme } = useMobileTheme();

    return (
      <TextInput
        ref={ref}
        style={[
          {
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surfaceSecondary,
          },
          style,
        ]}
        placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted}
        {...props}
      />
    );
  },
);
