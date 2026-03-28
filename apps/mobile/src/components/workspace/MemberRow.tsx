import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { UserId } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  id: UserId;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isCurrentUser: boolean;
  canChangeRole: boolean;
  canRemove: boolean;
  onChangeRole: (userId: UserId, newRole: string) => void;
  onRemove: (userId: UserId, displayName: string) => void;
}

import { WHITE } from "@/theme/constants";
const OWNER_TEXT_COLOR = "#d97706";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return name[0]?.toUpperCase() ?? "?";
}

function getRoleBadgeColors(theme: ReturnType<typeof useMobileTheme>["theme"]): Record<string, { bg: string; text: string }> {
  return {
    owner: { bg: theme.colors.surfaceTertiary, text: OWNER_TEXT_COLOR },
    admin: { bg: theme.colors.surfaceTertiary, text: theme.brand.primary },
    member: { bg: theme.colors.surfaceTertiary, text: theme.colors.textMuted },
  };
}

export function MemberRow({
  id,
  displayName,
  email,
  avatarUrl,
  role,
  isCurrentUser,
  canChangeRole,
  canRemove,
  onChangeRole,
  onRemove,
}: Props) {
  const { theme } = useMobileTheme();
  const roleBadgeColors = getRoleBadgeColors(theme);
  const badgeColor = roleBadgeColors[role] ?? roleBadgeColors.member!;

  return (
    <View testID={`member-row-${id}`} style={[styles.container, { borderBottomColor: theme.colors.borderDefault }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatarImage, { backgroundColor: theme.colors.surfaceTertiary }]}
        />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.brand.primary }]}>
          <Text style={styles.avatarInitials}>
            {getInitials(displayName)}
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
          {displayName}
          {isCurrentUser && (
            <Text style={[styles.youLabel, { color: theme.colors.textSecondary }]}> (you)</Text>
          )}
        </Text>
        <Text style={[styles.email, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {email}
        </Text>
      </View>

      <View
        style={[styles.roleBadge, { backgroundColor: badgeColor.bg }]}
      >
        <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>
          {role}
        </Text>
      </View>

      {canChangeRole && (
        <Pressable
          testID={`role-toggle-${id}`}
          accessibilityRole="button"
          accessibilityLabel={role === "admin" ? "Demote member" : "Promote member"}
          accessibilityHint={`Changes ${displayName}'s role`}
          onPress={() => onChangeRole(id, role === "admin" ? "member" : "admin")}
          style={[styles.actionButton, { borderColor: theme.colors.borderDefault }]}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>
            {role === "admin" ? "Demote" : "Promote"}
          </Text>
        </Pressable>
      )}

      {canRemove && (
        <Pressable
          testID={`remove-member-${id}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${displayName}`}
          accessibilityHint="Removes this member from the workspace"
          onPress={() => onRemove(id, displayName)}
          style={[styles.removeButton, { borderColor: theme.brand.danger }]}
        >
          <Text style={[styles.removeButtonText, { color: theme.brand.danger }]}>Remove</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  displayName: {
    fontSize: 15,
    fontWeight: "500",
  },
  youLabel: {
    fontWeight: "400",
  },
  email: {
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 4,
  },
  actionButtonText: {
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 12,
  },
});
