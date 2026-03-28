import { useCallback, useEffect, useState } from "react";
import { View, Text, Switch, Pressable, Linking, ActivityIndicator, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import {
  getGlobalNotificationPrefs,
  updateGlobalNotificationPrefs,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { MobileTheme } from "@openslaq/shared";

type PermissionState = "loading" | "undetermined" | "granted" | "denied";

export default function NotificationSettingsScreen() {
  const { theme } = useMobileTheme();
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const [enabled, setEnabled] = useState(false);
  const [sound, setSound] = useState(true);
  const [permissionState, setPermissionState] = useState<PermissionState>("loading");
  const styles = makeStyles(theme);

  const deps = { api, auth: authProvider };

  // Load saved preferences and current permission status on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [prefs, permission] = await Promise.all([
        getGlobalNotificationPrefs(deps),
        Notifications.getPermissionsAsync(),
      ]);
      if (cancelled) return;
      setEnabled(prefs.pushEnabled);
      setSound(prefs.soundEnabled);
      setPermissionState(permission.granted ? "granted" : permission.canAskAgain ? "undetermined" : "denied");
    })();
    return () => {
      cancelled = true;
    };
     
  }, []);

  const handleTogglePush = useCallback(
    async (value: boolean) => {
      if (value) {
        // Request OS permission
        const result = await Notifications.requestPermissionsAsync();
        if (result.granted) {
          setPermissionState("granted");
          setEnabled(true);
          await updateGlobalNotificationPrefs(deps, { pushEnabled: true });
        } else {
          setPermissionState(result.canAskAgain ? "undetermined" : "denied");
        }
      } else {
        setEnabled(false);
        await updateGlobalNotificationPrefs(deps, { pushEnabled: false });
      }
    },
     
    [],
  );

  const handleToggleSound = useCallback(
    async (value: boolean) => {
      setSound(value);
      await updateGlobalNotificationPrefs(deps, { soundEnabled: value });
    },
     
    [],
  );

  if (permissionState === "loading") {
    return (
      <View testID="notification-settings-loading" style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View testID="notification-settings-screen" style={styles.container}>
      {/* Push Notifications toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Push Notifications</Text>
        <Switch
          testID="push-toggle"
          value={enabled}
          onValueChange={handleTogglePush}
          trackColor={{ true: theme.brand.primary }}
        />
      </View>

      {/* Sound toggle */}
      <View style={[styles.toggleRow, !enabled && styles.disabledOpacity]}>
        <Text style={styles.toggleLabel}>Sound</Text>
        <Switch
          testID="sound-toggle"
          value={sound}
          onValueChange={handleToggleSound}
          disabled={!enabled}
          trackColor={{ true: theme.brand.primary }}
        />
      </View>

      {/* Permission denied message */}
      {permissionState === "denied" && (
        <View testID="permission-denied-banner" style={styles.deniedBanner}>
          <Text style={styles.deniedText}>
            Notification permission was denied. Enable notifications in your device settings to receive push notifications.
          </Text>
          <Pressable
            testID="open-settings-button"
            onPress={() => void Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            accessibilityHint="Opens device settings to enable notifications"
            style={({ pressed }) => ({
              backgroundColor: pressed ? theme.brand.primary + "dd" : theme.brand.primary,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: "center",
            })}
          >
            <Text style={styles.openSettingsText}>Open Settings</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderDefault,
    },
    toggleLabel: {
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    disabledOpacity: {
      opacity: 0.4,
    },
    deniedBanner: {
      marginTop: 20,
      padding: 16,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 10,
    },
    deniedText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 10,
    },
    openSettingsText: {
      color: theme.colors.headerText,
      fontSize: 15,
      fontWeight: "600",
    },
  });
