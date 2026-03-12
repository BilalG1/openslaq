import { Pressable, ScrollView, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

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
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      style={{ flexGrow: 0 }}
    >
      {chips.map((chip) => {
        const active = Boolean(chip.value);
        return (
          <View key={chip.key} style={{ flexDirection: "row" }}>
            <Pressable
              testID={`filter-chip-${chip.key}`}
              onPress={chip.onPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: active ? theme.brand.primary : theme.colors.borderDefault,
                backgroundColor: active ? theme.brand.primary + "15" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: active ? theme.brand.primary : theme.colors.textSecondary,
                  fontWeight: active ? "600" : "400",
                }}
                numberOfLines={1}
              >
                {chip.value ?? chip.label}
              </Text>
              {active && (
                <Pressable
                  testID={`filter-chip-clear-${chip.key}`}
                  onPress={() => chip.onClear()}
                  hitSlop={8}
                  style={{ marginLeft: 6 }}
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
