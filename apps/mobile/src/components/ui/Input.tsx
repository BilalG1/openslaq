import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

export const Input = forwardRef<TextInput, TextInputProps>(
  function Input({ style, placeholderTextColor, ...props }, ref) {
    const { theme } = useMobileTheme();

    return (
      <TextInput
        ref={ref}
        style={[
          styles.input,
          {
            borderColor: theme.colors.borderDefault,
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

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
