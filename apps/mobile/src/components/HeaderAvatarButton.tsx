import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  statusEmoji?: string | null;
  onPress: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    fallback: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.brand.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: {
      color: theme.colors.headerText,
      fontSize: 12,
      fontWeight: "700",
    },
    container: {
      position: "relative" as const,
    },
    statusBadge: {
      position: "absolute" as const,
      bottom: -2,
      right: -2,
      fontSize: 10,
      lineHeight: 12,
    },
  });

export function HeaderAvatarButton({ avatarUrl, displayName, statusEmoji, onPress }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      testID="header-avatar-button"
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="User profile"
      accessibilityHint="Opens your profile menu"
    >
      <View style={styles.container}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.fallback}>
            <Text
              testID="header-avatar-initials"
              style={styles.initials}
            >
              {getInitials(displayName)}
            </Text>
          </View>
        )}
        {statusEmoji ? (
          <Text testID="header-avatar-status-emoji" style={styles.statusBadge}>
            {statusEmoji}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
