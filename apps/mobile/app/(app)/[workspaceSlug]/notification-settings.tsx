import { useCallback, useEffect, useState } from "react";
import { View, Text, Switch, Pressable, Linking, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";
import {
  getGlobalNotificationPrefs,
  updateGlobalNotificationPrefs,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useMobileTheme } from "@/theme/ThemeProvider";

type PermissionState = "loading" | "undetermined" | "granted" | "denied";

export default function NotificationSettingsScreen() {
  const { theme } = useMobileTheme();
  const { authProvider } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [sound, setSound] = useState(true);
  const [permissionState, setPermissionState] = useState<PermissionState>("loading");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleToggleSound = useCallback(
    async (value: boolean) => {
      setSound(value);
      await updateGlobalNotificationPrefs(deps, { soundEnabled: value });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (permissionState === "loading") {
    return (
      <View
        testID="notification-settings-loading"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
      >
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View
      testID="notification-settings-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface, paddingHorizontal: 24, paddingTop: 24 }}
    >
      {/* Push Notifications toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderDefault,
        }}
      >
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>Push Notifications</Text>
        <Switch
          testID="push-toggle"
          value={enabled}
          onValueChange={handleTogglePush}
          trackColor={{ true: theme.brand.primary }}
        />
      </View>

      {/* Sound toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderDefault,
          opacity: enabled ? 1 : 0.4,
        }}
      >
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>Sound</Text>
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
        <View testID="permission-denied-banner" style={{ marginTop: 20, padding: 16, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 10 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 10 }}>
            Notification permission was denied. Enable notifications in your device settings to receive push notifications.
          </Text>
          <Pressable
            testID="open-settings-button"
            onPress={() => void Linking.openSettings()}
            style={({ pressed }) => ({
              backgroundColor: pressed ? theme.brand.primary + "dd" : theme.brand.primary,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Open Settings</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
