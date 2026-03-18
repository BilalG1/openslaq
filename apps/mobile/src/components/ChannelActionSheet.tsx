import { Alert, Pressable, Text, View } from "react-native";
import type { Channel, ChannelNotifyLevel } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  channel: Channel | null;
  isStarred: boolean;
  isMuted: boolean;
  notifyLevel: ChannelNotifyLevel;
  isAdmin: boolean;
  onStar: (channelId: string) => void;
  onUnstar: (channelId: string) => void;
  onSetNotificationPref: (channelId: string, level: ChannelNotifyLevel) => void;
  onArchive: (channelId: string) => void;
  onClose: () => void;
}

const NOTIFY_LABELS: Record<ChannelNotifyLevel, string> = {
  all: "All messages",
  mentions: "Mentions only",
  muted: "Muted",
};

export function ChannelActionSheet({
  visible,
  channel,
  isStarred,
  isMuted: _isMuted,
  notifyLevel,
  isAdmin,
  onStar,
  onUnstar,
  onSetNotificationPref,
  onArchive,
  onClose,
}: Props) {
  const { theme } = useMobileTheme();

  if (!channel) return null;

  const handleStar = () => {
    haptics.selection();
    onClose();
    if (isStarred) {
      onUnstar(channel.id);
    } else {
      onStar(channel.id);
    }
  };

  const handleNotificationPref = () => {
    haptics.selection();
    onClose();
    const levels: ChannelNotifyLevel[] = ["all", "mentions", "muted"];
    Alert.alert(
      "Notification Preference",
      `Currently: ${NOTIFY_LABELS[notifyLevel]}`,
      [
        ...levels
          .filter((l) => l !== notifyLevel)
          .map((level) => ({
            text: NOTIFY_LABELS[level],
            onPress: () => onSetNotificationPref(channel.id, level),
          })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  const handleArchive = () => {
    haptics.selection();
    onClose();
    Alert.alert(
      "Archive Channel",
      `Are you sure you want to archive #${channel.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => onArchive(channel.id),
        },
      ],
    );
  };

  const actionButtonStyle = (pressed: boolean) => ({
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: pressed ? theme.colors.surfaceTertiary : ("transparent" as string),
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="channel-action-sheet-content">
      {/* Channel name header */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: theme.colors.textPrimary,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        # {channel.name}
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginBottom: 8 }} />

      {/* Star / Unstar */}
      <Pressable
        testID={isStarred ? "action-unstar-channel" : "action-star-channel"}
        onPress={handleStar}
        style={({ pressed }) => actionButtonStyle(pressed)}
      >
        <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>
          {isStarred ? "Unstar Channel" : "Star Channel"}
        </Text>
      </Pressable>

      {/* Notification preference */}
      <Pressable
        testID="action-notification-pref"
        onPress={handleNotificationPref}
        style={({ pressed }) => actionButtonStyle(pressed)}
      >
        <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>
          Notifications: {NOTIFY_LABELS[notifyLevel]}
        </Text>
      </Pressable>

      {/* Archive — admin only */}
      {isAdmin && (
        <>
          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginVertical: 8 }} />
          <Pressable
            testID="action-archive-channel"
            onPress={handleArchive}
            style={({ pressed }) => actionButtonStyle(pressed)}
          >
            <Text style={{ fontSize: 16, color: theme.brand.danger }}>Archive Channel</Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}
