import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { WHITE } from "@/theme/constants";
import type { MobileTheme } from "@openslaq/shared";

export default function NotFoundScreen() {
  const router = useRouter();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container} testID="not-found-screen">
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.subtitle}>This link doesn't match any page in the app.</Text>
      <Pressable
        testID="go-home-button"
        role="button"
        onPress={() => router.replace("/")}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.buttonText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      padding: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    button: {
      backgroundColor: theme.brand.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: WHITE,
      fontWeight: "600",
      fontSize: 16,
    },
  });
