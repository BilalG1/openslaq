import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useSocket } from "@/contexts/SocketProvider";
import type { SocketStatus } from "@openslaq/client-core";

const STATUS_CONFIG: Record<string, { label: string; kind: "warning" | "error" }> = {
  connecting: { label: "Connecting...", kind: "warning" },
  reconnecting: { label: "Reconnecting...", kind: "warning" },
  disconnected: { label: "No connection", kind: "error" },
  error: { label: "Connection error", kind: "error" },
};

function getDisplayConfig(
  status: SocketStatus,
  isNetworkOffline: boolean,
): { label: string; kind: "warning" | "error" } | null {
  // Network-level offline takes priority over socket status
  if (isNetworkOffline) {
    return { label: "No internet connection", kind: "error" };
  }
  return STATUS_CONFIG[status] ?? null;
}

export function ConnectionStatusBanner() {
  const { status, isNetworkOffline } = useSocket();
  const { theme } = useMobileTheme();
  const translateY = useRef(new Animated.Value(-40)).current;
  const [visible, setVisible] = useState(false);

  const config = getDisplayConfig(status, isNetworkOffline);

  useEffect(() => {
    if (config) {
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -40,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [config !== null, translateY]);

  if (!visible || !config) return null;

  const bgColor = config.kind === "error" ? theme.colors.dangerBg : theme.colors.warningBg;
  const textColor = config.kind === "error" ? theme.colors.dangerText : theme.colors.warningText;

  return (
    <Animated.View
      testID="connection-status-banner"
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: bgColor, transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{config.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
});
