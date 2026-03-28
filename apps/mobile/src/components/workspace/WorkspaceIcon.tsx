import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

import { TRANSPARENT, WHITE } from "@/theme/constants";

interface Props {
  name: string;
  isActive: boolean;
  onPress: () => void;
}

function getInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export function WorkspaceIcon({ name, isActive, onPress }: Props) {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      testID={`workspace-icon-${name}`}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${name} workspace`}
      accessibilityHint="Switches to this workspace"
      onPress={onPress}
      hitSlop={4}
      style={styles.pressable}
    >
      <View
        style={[
          isActive ? styles.iconBoxActive : styles.iconBox,
          {
            backgroundColor: isActive ? theme.brand.primary : theme.colors.surfaceTertiary,
            borderColor: isActive ? theme.brand.primary : TRANSPARENT,
          },
        ]}
      >
        <Text
          style={[
            styles.initial,
            { color: isActive ? WHITE : theme.colors.textPrimary },
          ]}
        >
          {getInitial(name)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: "center",
    marginVertical: 6,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  iconBoxActive: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  initial: {
    fontSize: 18,
    fontWeight: "700",
  },
});
