import { View, Text, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function MoreScreen() {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();

  const items = [
    { label: "Settings", onPress: () => router.push(`/(app)/${workspaceSlug}/settings`) },
  ];

  return (
    <View
      testID="more-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface, paddingTop: 60 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: theme.colors.textPrimary,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        More
      </Text>
      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: pressed ? theme.colors.surfaceHover : theme.colors.surface,
          })}
        >
          <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
