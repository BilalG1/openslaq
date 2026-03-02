import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

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
      onPress={onPress}
      hitSlop={4}
      style={{ alignItems: "center", marginVertical: 6 }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: isActive ? theme.brand.primary : theme.colors.surfaceTertiary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: isActive ? 2 : 0,
          borderColor: isActive ? theme.brand.primary : "transparent",
        }}
      >
        <Text
          style={{
            color: isActive ? "#fff" : theme.colors.textPrimary,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          {getInitial(name)}
        </Text>
      </View>
    </Pressable>
  );
}
