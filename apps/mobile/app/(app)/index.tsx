import { useEffect } from "react";
import { View, ActivityIndicator, NativeModules, Settings } from "react-native";
import { Redirect } from "expo-router";
import { listWorkspaces } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useState } from "react";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function WorkspaceIndex() {
  const { authProvider } = useAuth();
  const { theme } = useMobileTheme();
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      try {
        const workspaces = await listWorkspaces({ api, auth: authProvider });
        if (workspaces.length > 0) {
          setSlug(workspaces[0].slug);
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return <Redirect href={`/(app)/${slug ?? "default"}/(channels)`} />;
}
