import { View, Text, Pressable, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme-preferences";
import type { MobileTheme } from "@openslaq/shared";

const options: { value: ThemePreference; label: string; subtitle?: string; testID: string }[] = [
  { value: "system", label: "System", subtitle: "Match your device settings", testID: "theme-option-system" },
  { value: "light", label: "Light", testID: "theme-option-light" },
  { value: "dark", label: "Dark", testID: "theme-option-dark" },
];

export default function PreferencesScreen() {
  const { theme, themePreference, setThemePreference } = useMobileTheme();
  const styles = makeStyles(theme);

  return (
    <View testID="preferences-screen" style={styles.container}>
      <Text style={styles.heading}>
        Appearance
      </Text>
      <Text style={styles.subheading}>
        Choose your color mode
      </Text>

      {options.map((option) => {
        const isActive = themePreference === option.value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            onPress={() => setThemePreference(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityHint={`Sets theme to ${option.label}`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: pressed ? theme.colors.surfaceSecondary : theme.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderDefault,
            })}
          >
            <View>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {option.subtitle && (
                <Text style={styles.optionSubtitle}>
                  {option.subtitle}
                </Text>
              )}
            </View>
            {isActive && (
              <Check testID={`${option.testID}-check`} size={18} color={theme.brand.primary} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    heading: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 4,
    },
    subheading: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginBottom: 16,
    },
    optionLabel: {
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    optionSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
  });
