import { Pressable, Text, View } from "react-native";
import type { Channel, ChannelNotifyLevel } from "@openslaq/shared";
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
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

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
  onClose,
}: ChannelInfoPanelProps) {
  const { theme } = useMobileTheme();

  if (!channel) return null;

  const ChannelIcon = channel.type === "private" ? Lock : Hash;

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable maxHeight="85%">
      {/* Drag handle */}
      <View style={{ alignItems: "center", paddingVertical: 10 }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.textFaint,
          }}
        />
      </View>

      {/* Hero section */}
      <View style={{ alignItems: "center", paddingHorizontal: 24, paddingBottom: 20 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <ChannelIcon size={28} color={theme.colors.textPrimary} />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.textPrimary,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {channel.displayName ?? channel.name}
        </Text>
        {channel.description ? (
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
              textAlign: "center",
              lineHeight: 20,
            }}
            numberOfLines={4}
          >
            {channel.description}
          </Text>
        ) : null}
      </View>

      {/* Stats row */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          gap: 10,
          marginBottom: 20,
        }}
      >
        <StatCard label="Members" value={channel.memberCount ?? 0} theme={theme} />
        <StatCard label="Pinned" value={pinCount} theme={theme} />
      </View>

      {/* Quick action circles */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 32,
          paddingHorizontal: 16,
          paddingBottom: 20,
        }}
      >
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

      <View
        style={{
          height: 1,
          backgroundColor: theme.colors.borderDefault,
          marginHorizontal: 16,
        }}
      />

      {/* Navigation rows */}
      <View style={{ paddingVertical: 4 }}>
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

      <View
        style={{
          height: 1,
          backgroundColor: theme.colors.borderDefault,
          marginHorizontal: 16,
        }}
      />

      {/* Footer */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.textFaint,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Created on {formatDate(channel.createdAt)}
        </Text>
        <Pressable
          onPress={onLeaveChannel}
          style={({ pressed }) => ({
            paddingVertical: 12,
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: "500", color: theme.brand.danger }}>
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
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surfaceSecondary,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>{label}</Text>
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: active ? theme.colors.surfaceSelected : theme.colors.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{label}</Text>
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? theme.colors.surfaceHover : "transparent",
      })}
    >
      {icon}
      <Text
        style={{
          flex: 1,
          fontSize: 16,
          color: theme.colors.textPrimary,
          marginLeft: 12,
        }}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text style={{ fontSize: 14, color: theme.colors.textMuted, marginRight: 4 }}>
          {count}
        </Text>
      )}
      <ChevronRight size={18} color={theme.colors.textFaint} />
    </Pressable>
  );
}
