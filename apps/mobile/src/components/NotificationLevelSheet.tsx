import type React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Bell, MessageSquare, BellOff, Check } from "lucide-react-native";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

const LEVELS: { value: ChannelNotifyLevel; icon: React.ReactNode; label: string; description: string }[] = [
  { value: "all", icon: <Bell size={22} color="#666" />, label: "All messages", description: "Get notified for every message in this channel" },
  { value: "mentions", icon: <MessageSquare size={22} color="#666" />, label: "Mentions only", description: "Only get notified when you are mentioned" },
  { value: "muted", icon: <BellOff size={22} color="#666" />, label: "Muted", description: "Never get notified for this channel" },
];

interface Props {
  visible: boolean;
  currentLevel: ChannelNotifyLevel;
  onSelect: (level: ChannelNotifyLevel) => void;
  onClose: () => void;
}

export function NotificationLevelSheet({ visible, currentLevel, onSelect, onClose }: Props) {
  const { theme } = useMobileTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="notification-sheet-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          testID="notification-sheet-content"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 34,
            paddingTop: 12,
            paddingHorizontal: 16,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 12 }}>
            Notifications
          </Text>
          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginBottom: 4 }} />
          {LEVELS.map((level) => {
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
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
                })}
              >
                <View style={{ marginRight: 12 }}>{level.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>{level.label}</Text>
                  <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>
                    {level.description}
                  </Text>
                </View>
                {isSelected && (
                  <Check testID={`notification-check-${level.value}`} size={18} color={theme.brand.primary} />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
