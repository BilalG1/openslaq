import { useMemo } from "react";
import { Alert, Pressable, Text, View, StyleSheet } from "react-native";
import type { Channel, ChannelNotifyLevel, MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { confirmAction } from "@/lib/confirm";

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
  onChannelInfo: (channelId: string) => void;
  onLeaveChannel: (channelId: string) => void;
  onClose: () => void;
}

const NOTIFY_LABELS: Record<ChannelNotifyLevel, string> = {
  all: "All messages",
  mentions: "Mentions only",
  muted: "Muted",
};

import { TRANSPARENT } from "@/theme/constants";

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    channelName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: 12,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.borderDefault,
      marginBottom: 8,
    },
    dividerVertical: {
      height: 1,
      backgroundColor: theme.colors.borderDefault,
      marginVertical: 8,
    },
    actionText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    dangerText: {
      fontSize: 16,
      color: theme.brand.danger,
    },
    actionButtonDefault: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: TRANSPARENT,
    },
    actionButtonPressed: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceTertiary,
    },
  });

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
  onChannelInfo,
  onLeaveChannel,
  onClose,
}: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

  const handleChannelInfo = () => {
    haptics.selection();
    onClose();
    onChannelInfo(channel.id);
  };

  const handleLeaveChannel = () => {
    haptics.selection();
    onClose();
    confirmAction(
      "Leave Channel",
      () => onLeaveChannel(channel.id),
      { message: `Are you sure you want to leave #${channel.name}?`, confirmLabel: "Leave", destructive: true },
    );
  };

  const handleArchive = () => {
    haptics.selection();
    onClose();
    confirmAction(
      "Archive Channel",
      () => onArchive(channel.id),
      { message: `Are you sure you want to archive #${channel.name}?`, confirmLabel: "Archive", destructive: true },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="channel-action-sheet-content">
      {/* Channel name header */}
      <Text style={styles.channelName}>
        # {channel.name}
      </Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Star / Unstar */}
      <Pressable
        testID={isStarred ? "action-unstar-channel" : "action-star-channel"}
        onPress={handleStar}
        accessibilityLabel={isStarred ? "Unstar channel" : "Star channel"}
        accessibilityHint={isStarred ? "Removes the channel from your starred list" : "Adds the channel to your starred list"}
        style={({ pressed }) => pressed ? styles.actionButtonPressed : styles.actionButtonDefault}
      >
        <Text style={styles.actionText}>
          {isStarred ? "Unstar Channel" : "Star Channel"}
        </Text>
      </Pressable>

      {/* Notification preference */}
      <Pressable
        testID="action-notification-pref"
        onPress={handleNotificationPref}
        accessibilityLabel="Change notification preference"
        accessibilityHint="Opens notification preference options"
        style={({ pressed }) => pressed ? styles.actionButtonPressed : styles.actionButtonDefault}
      >
        <Text style={styles.actionText}>
          Notifications: {NOTIFY_LABELS[notifyLevel]}
        </Text>
      </Pressable>

      {/* Channel Info */}
      <Pressable
        testID="action-channel-info"
        onPress={handleChannelInfo}
        accessibilityLabel="Channel info"
        accessibilityHint="Opens channel information panel"
        style={({ pressed }) => pressed ? styles.actionButtonPressed : styles.actionButtonDefault}
      >
        <Text style={styles.actionText}>Channel Info</Text>
      </Pressable>

      {/* Leave Channel */}
      <View style={styles.dividerVertical} />
      <Pressable
        testID="action-leave-channel"
        onPress={handleLeaveChannel}
        accessibilityLabel="Leave channel"
        accessibilityHint="Leaves this channel"
        style={({ pressed }) => pressed ? styles.actionButtonPressed : styles.actionButtonDefault}
      >
        <Text style={styles.dangerText}>Leave Channel</Text>
      </Pressable>

      {/* Archive — admin only */}
      {isAdmin && (
        <>
          <View style={styles.dividerVertical} />
          <Pressable
            testID="action-archive-channel"
            onPress={handleArchive}
            accessibilityLabel="Archive channel"
            accessibilityHint="Archives this channel permanently"
            style={({ pressed }) => pressed ? styles.actionButtonPressed : styles.actionButtonDefault}
          >
            <Text style={styles.dangerText}>Archive Channel</Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}
