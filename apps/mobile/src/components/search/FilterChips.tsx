import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

import { TRANSPARENT } from "@/theme/constants";

interface ChipDef {
  key: string;
  label: string;
  value?: string;
  onPress: () => void;
  onClear: () => void;
}

interface Props {
  chips: ChipDef[];
}

export function FilterChips({ chips }: Props) {
  const { theme } = useMobileTheme();

  return (
    <ScrollView
      testID="filter-chips"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {chips.map((chip) => {
        const active = Boolean(chip.value);
        return (
          <View key={chip.key} style={styles.chipRow}>
            <Pressable
              testID={`filter-chip-${chip.key}`}
              accessibilityRole="button"
              accessibilityLabel={chip.value ?? chip.label}
              accessibilityHint={active ? "Tap to change filter" : `Tap to filter by ${chip.label}`}
              onPress={chip.onPress}
              style={[
                styles.chipPressable,
                {
                  borderColor: active ? theme.brand.primary : theme.colors.borderDefault,
                  backgroundColor: active ? theme.brand.primary + "15" : TRANSPARENT,
                },
              ]}
            >
              <Text
                style={[
                  active ? styles.chipTextActive : styles.chipText,
                  { color: active ? theme.brand.primary : theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {chip.value ?? chip.label}
              </Text>
              {active && (
                <Pressable
                  testID={`filter-chip-clear-${chip.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Clear ${chip.label} filter`}
                  accessibilityHint="Removes this filter"
                  onPress={() => chip.onClear()}
                  hitSlop={8}
                  style={styles.clearButton}
                >
                  <X size={14} color={theme.brand.primary} />
                </Pressable>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: "row",
  },
  chipPressable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "400",
  },
  chipTextActive: {
    fontSize: 13,
    fontWeight: "600",
  },
  clearButton: {
    marginLeft: 6,
  },
});
