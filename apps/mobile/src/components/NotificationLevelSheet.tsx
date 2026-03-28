import type React from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell, MessageSquare, BellOff, Check } from "lucide-react-native";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";

import { TRANSPARENT } from "@/theme/constants";

interface LevelOption {
  value: ChannelNotifyLevel;
  iconName: "bell" | "message-square" | "bell-off";
  label: string;
  description: string;
}

const LEVEL_OPTIONS: LevelOption[] = [
  { value: "all", iconName: "bell", label: "All messages", description: "Get notified for every message in this channel" },
  { value: "mentions", iconName: "message-square", label: "Mentions only", description: "Only get notified when you are mentioned" },
  { value: "muted", iconName: "bell-off", label: "Muted", description: "Never get notified for this channel" },
];

function LevelIcon({ iconName, color }: { iconName: LevelOption["iconName"]; color: string }) {
  switch (iconName) {
    case "bell":
      return <Bell size={22} color={color} />;
    case "message-square":
      return <MessageSquare size={22} color={color} />;
    case "bell-off":
      return <BellOff size={22} color={color} />;
  }
}

interface Props {
  visible: boolean;
  currentLevel: ChannelNotifyLevel;
  onSelect: (level: ChannelNotifyLevel) => void;
  onClose: () => void;
}

export function NotificationLevelSheet({ visible, currentLevel, onSelect, onClose }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Notifications" testID="notification-sheet-content">
      <View style={styles.divider} />
      {LEVEL_OPTIONS.map((level) => {
        const isSelected = level.value === currentLevel;
        return (
          <Pressable
            key={level.value}
            testID={`notification-level-${level.value}`}
            onPress={() => {
              if (!isSelected) {
                onSelect(level.value);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`${level.label}${isSelected ? ", selected" : ""}`}
            accessibilityHint={level.description}
            style={({ pressed }) => ({
              flexDirection: "row" as const,
              alignItems: "center" as const,
              paddingVertical: 14,
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT,
            })}
          >
            <View style={styles.iconContainer}>
              <LevelIcon iconName={level.iconName} color={theme.colors.iconDefault} />
            </View>
            <View style={staticStyles.labelContainer}>
              <Text style={styles.label}>{level.label}</Text>
              <Text style={styles.description}>
                {level.description}
              </Text>
            </View>
            {isSelected && (
              <Check testID={`notification-check-${level.value}`} size={18} color={theme.brand.primary} />
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const staticStyles = StyleSheet.create({
  labelContainer: {
    flex: 1,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    divider: {
      height: 1,
      backgroundColor: theme.colors.borderDefault,
      marginBottom: 4,
    },
    iconContainer: {
      marginRight: 12,
    },
    label: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    description: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
