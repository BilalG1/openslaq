import { useMemo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import type { Channel, ChannelNotifyLevel, MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  Hash,
  Lock,
  Star,
  BellOff,
  Bell,
  MessageSquare,
  Pencil,
  Users,
  Pin,
  File,
  ChevronRight,
} from "lucide-react-native";

interface ChannelInfoPanelProps {
  visible: boolean;
  channel: Channel | undefined;
  isStarred: boolean;
  notificationLevel: ChannelNotifyLevel;
  pinCount: number;
  onToggleStar: () => void;
  onNotificationPress: () => void;
  onViewMembers: () => void;
  onViewPinned: () => void;
  onViewFiles: () => void;
  onEditTopic: () => void;
  onLeaveChannel: () => void;
  onArchiveChannel?: () => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

import { TRANSPARENT } from "@/theme/constants";

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    heroSection: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    channelName: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
      textAlign: "center",
    },
    channelDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 10,
      marginBottom: 20,
    },
    quickActionsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 32,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.borderDefault,
      marginHorizontal: 16,
    },
    navSection: {
      paddingVertical: 4,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    createdDate: {
      fontSize: 13,
      color: theme.colors.textFaint,
      textAlign: "center",
      marginBottom: 16,
    },
    leaveButtonDefault: {
      paddingVertical: 12,
      alignItems: "center",
      opacity: 1,
    },
    leaveButtonPressed: {
      paddingVertical: 12,
      alignItems: "center",
      opacity: 0.6,
    },
    leaveText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.brand.danger,
    },
    statCardContainer: {
      flex: 1,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    statCardValue: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    statCardLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    quickActionDefault: {
      alignItems: "center",
      opacity: 1,
    },
    quickActionPressed: {
      alignItems: "center",
      opacity: 0.6,
    },
    quickActionLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    navRowDefault: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: TRANSPARENT,
    },
    navRowPressed: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.surfaceHover,
    },
    navRowLabel: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginLeft: 12,
    },
    navRowCount: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginRight: 4,
    },
  });

const makeQuickActionIconStyles = (theme: MobileTheme, active: boolean) =>
  StyleSheet.create({
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: active ? theme.colors.surfaceSelected : theme.colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
  });

export function ChannelInfoPanel({
  visible,
  channel,
  isStarred,
  notificationLevel,
  pinCount,
  onToggleStar,
  onNotificationPress,
  onViewMembers,
  onViewPinned,
  onViewFiles,
  onEditTopic,
  onLeaveChannel,
  onArchiveChannel,
  onClose,
}: ChannelInfoPanelProps) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!channel) return null;

  const ChannelIcon = channel.type === "private" ? Lock : Hash;

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable maxHeight="85%">
      {/* Hero section */}
      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <ChannelIcon size={28} color={theme.colors.textPrimary} />
        </View>
        <Text style={styles.channelName}>
          {channel.displayName ?? channel.name}
        </Text>
        {channel.description ? (
          <Text style={styles.channelDescription} numberOfLines={4}>
            {channel.description}
          </Text>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Members" value={channel.memberCount ?? 0} theme={theme} />
        <StatCard label="Pinned" value={pinCount} theme={theme} />
      </View>

      {/* Quick action circles */}
      <View style={styles.quickActionsRow}>
        <QuickAction
          icon={
            <Star
              size={22}
              color={isStarred ? theme.brand.primary : theme.colors.textSecondary}
              fill={isStarred ? theme.brand.primary : "none"}
            />
          }
          label={isStarred ? "Starred" : "Star"}
          onPress={onToggleStar}
          active={isStarred}
          theme={theme}
        />
        <QuickAction
          icon={
            notificationLevel === "muted" ? (
              <BellOff size={22} color={theme.brand.primary} />
            ) : notificationLevel === "mentions" ? (
              <MessageSquare size={22} color={theme.brand.primary} />
            ) : (
              <Bell size={22} color={theme.colors.textSecondary} />
            )
          }
          label={notificationLevel === "muted" ? "Muted" : notificationLevel === "mentions" ? "Mentions" : "Notifications"}
          onPress={onNotificationPress}
          active={notificationLevel !== "all"}
          theme={theme}
        />
        <QuickAction
          icon={<Pencil size={22} color={theme.colors.textSecondary} />}
          label="Topic"
          onPress={onEditTopic}
          active={false}
          theme={theme}
        />
      </View>

      <View style={styles.separator} />

      {/* Navigation rows */}
      <View style={styles.navSection}>
        <NavRow
          icon={<Users size={20} color={theme.colors.textSecondary} />}
          label="Members"
          count={channel.memberCount ?? 0}
          onPress={onViewMembers}
          theme={theme}
        />
        <NavRow
          icon={<Pin size={20} color={theme.colors.textSecondary} />}
          label="Pinned Messages"
          count={pinCount}
          onPress={onViewPinned}
          theme={theme}
        />
        <NavRow
          icon={<File size={20} color={theme.colors.textSecondary} />}
          label="Files"
          onPress={onViewFiles}
          theme={theme}
        />
      </View>

      <View style={styles.separator} />

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.createdDate}>
          Created on {formatDate(channel.createdAt)}
        </Text>
        {onArchiveChannel && (
          <Pressable
            onPress={onArchiveChannel}
            accessibilityLabel="Archive channel"
            accessibilityHint="Archives this channel"
            style={({ pressed }) => pressed ? styles.leaveButtonPressed : styles.leaveButtonDefault}
          >
            <Text style={styles.leaveText}>
              Archive Channel
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onLeaveChannel}
          accessibilityLabel="Leave channel"
          accessibilityHint="Leaves this channel"
          style={({ pressed }) => pressed ? styles.leaveButtonPressed : styles.leaveButtonDefault}
        >
          <Text style={styles.leaveText}>
            Leave Channel
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/* ── Subcomponents ── */

interface StatCardProps {
  label: string;
  value: number | string;
  theme: ReturnType<typeof useMobileTheme>["theme"];
}

function StatCard({ label, value, theme }: StatCardProps) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statCardContainer}>
      <Text style={styles.statCardValue}>
        {value}
      </Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active: boolean;
  theme: ReturnType<typeof useMobileTheme>["theme"];
}

function QuickAction({ icon, label, onPress, active, theme }: QuickActionProps) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const iconStyles = makeQuickActionIconStyles(theme, active);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint={`Activates ${label.toLowerCase()} action`}
      style={({ pressed }) => pressed ? styles.quickActionPressed : styles.quickActionDefault}
    >
      <View style={iconStyles.iconCircle}>
        {icon}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

interface NavRowProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onPress: () => void;
  theme: ReturnType<typeof useMobileTheme>["theme"];
}

function NavRow({ icon, label, count, onPress, theme }: NavRowProps) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint={`Opens ${label.toLowerCase()}`}
      style={({ pressed }) => pressed ? styles.navRowPressed : styles.navRowDefault}
    >
      {icon}
      <Text style={styles.navRowLabel}>
        {label}
      </Text>
      {count !== undefined && (
        <Text style={styles.navRowCount}>
          {count}
        </Text>
      )}
      <ChevronRight size={18} color={theme.colors.textFaint} />
    </Pressable>
  );
}
