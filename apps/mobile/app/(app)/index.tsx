import { useEffect, useState } from "react";
import { View, ActivityIndicator, NativeModules, Settings, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { listWorkspaces, acceptInvite } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import { consumePendingInvite } from "@/lib/pending-invite";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";

export default function WorkspaceIndex() {
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const { theme } = useMobileTheme();
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const styles = makeStyles(theme);

  useEffect(() => {
    void (async () => {
      // In E2E tests, Detox passes the workspace slug as a launch arg.
      const devArgs = NativeModules.DevSettings?.launchArgs;
      const detoxSlug =
        devArgs?.detoxWorkspaceSlug ?? Settings.get("detoxWorkspaceSlug");
      if (detoxSlug) {
        setSlug(detoxSlug);
        setLoading(false);
        return;
      }

      // Check for pending invite from deep link
      const pendingCode = await consumePendingInvite();
      if (pendingCode) {
        try {
          const result = await acceptInvite({ api, auth: authProvider }, pendingCode);
          setSlug(result.slug);
          setLoading(false);
          return;
        } catch {
          // Invite failed, fall through to normal flow
        }
      }

      try {
        const workspaces = await listWorkspaces({ api, auth: authProvider });
        if (workspaces.length > 0) {
          setSlug(workspaces[0]!.slug);
        } else {
          setSlug("__none__");
        }
      } catch {
        // Fall back to default workspace
        setSlug("default");
      } finally {
        setLoading(false);
      }
    })();
  }, [authProvider]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (slug === "__none__") {
    return <Redirect href="/(app)/no-workspaces" />;
  }

  return <Redirect href={`/(app)/${slug ?? "default"}/(channels)`} />;
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
