import { View, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { JoinWorkspaceForm } from "@/components/workspace/JoinWorkspaceForm";
import { routes } from "@/lib/routes";
import type { MobileTheme } from "@openslaq/shared";

export default function JoinWorkspaceScreen() {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const styles = makeStyles(theme);

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View testID="join-workspace-screen" style={styles.inner}>
        <JoinWorkspaceForm onJoined={(slug) => router.replace(routes.channels(slug))} />
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    kav: { flex: 1, backgroundColor: theme.colors.surface },
    inner: { flex: 1, padding: 24, paddingTop: 32 },
  });
