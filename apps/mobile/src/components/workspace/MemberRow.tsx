import { Image, Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isCurrentUser: boolean;
  canChangeRole: boolean;
  canRemove: boolean;
  onChangeRole: (userId: string, newRole: string) => void;
  onRemove: (userId: string, displayName: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() ?? "?";
}

const roleBadgeColors: Record<string, { bg: string; text: string }> = {
  owner: { bg: "#fef3c7", text: "#92400e" },
  admin: { bg: "#dbeafe", text: "#1e40af" },
  member: { bg: "#f3f4f6", text: "#6b7280" },
};

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
  const badgeColor = roleBadgeColors[role] ?? roleBadgeColors.member;

  return (
    <View
      testID={`member-row-${id}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderDefault,
      }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.surfaceTertiary,
          }}
        />
      ) : (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.brand.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
            {getInitials(displayName)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }}>
          {displayName}
          {isCurrentUser && (
            <Text style={{ color: theme.colors.textSecondary, fontWeight: "400" }}> (you)</Text>
          )}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
          {email}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: badgeColor.bg,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
          marginRight: 8,
        }}
      >
        <Text style={{ color: badgeColor.text, fontSize: 11, fontWeight: "600" }}>
          {role}
        </Text>
      </View>

      {canChangeRole && (
        <Pressable
          testID={`role-toggle-${id}`}
          onPress={() => onChangeRole(id, role === "admin" ? "member" : "admin")}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
            marginRight: 4,
          }}
        >
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {role === "admin" ? "Demote" : "Promote"}
          </Text>
        </Pressable>
      )}

      {canRemove && (
        <Pressable
          testID={`remove-member-${id}`}
          onPress={() => onRemove(id, displayName)}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#ef4444",
          }}
        >
          <Text style={{ color: "#ef4444", fontSize: 12 }}>Remove</Text>
        </Pressable>
      )}
    </View>
  );
}
