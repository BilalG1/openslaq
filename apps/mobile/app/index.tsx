import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();
  const { theme } = useMobileTheme();
  const styles = makeStyles(theme);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(app)" />;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
  });
