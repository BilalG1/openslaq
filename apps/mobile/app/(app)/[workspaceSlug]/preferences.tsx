import { View, Text, Pressable } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme-preferences";

const options: { value: ThemePreference; label: string; subtitle?: string; testID: string }[] = [
  { value: "system", label: "System", subtitle: "Match your device settings", testID: "theme-option-system" },
  { value: "light", label: "Light", testID: "theme-option-light" },
  { value: "dark", label: "Dark", testID: "theme-option-dark" },
];

export default function PreferencesScreen() {
  const { theme, themePreference, setThemePreference } = useMobileTheme();

  return (
    <View
      testID="preferences-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface, paddingHorizontal: 24, paddingTop: 24 }}
    >
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 4 }}>
        Appearance
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
        Choose your color mode
      </Text>

      {options.map((option) => {
        const isActive = themePreference === option.value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            onPress={() => setThemePreference(option.value)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: pressed ? theme.colors.surfaceSecondary : "transparent",
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderDefault,
            })}
          >
            <View>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>{option.label}</Text>
              {option.subtitle && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {option.subtitle}
                </Text>
              )}
            </View>
            {isActive && (
              <Text testID={`${option.testID}-check`} style={{ color: theme.brand.primary, fontSize: 18 }}>
                ✓
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
