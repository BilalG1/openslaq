import { memo, useMemo } from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { asUserId, type MobileTheme, type UserId } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  token: string;
  displayName?: string;
  onPress?: (userId: UserId) => void;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    pressable: {
      borderRadius: 3,
      paddingHorizontal: 2,
    },
    pressableGroup: {
      backgroundColor: theme.colors.mentionGroupBg,
    },
    pressableUser: {
      backgroundColor: theme.colors.mentionUserBg,
    },
    textGroup: {
      color: theme.colors.mentionGroupText,
      fontWeight: "600",
      fontSize: 14,
    },
    textUser: {
      color: theme.brand.primary,
      fontWeight: "600",
      fontSize: 14,
    },
    inlineBadge: {
      fontWeight: "600",
      fontSize: 14,
      borderRadius: 3,
      paddingHorizontal: 2,
    },
    inlineBadgeGroup: {
      backgroundColor: theme.colors.mentionGroupBg,
      color: theme.colors.mentionGroupText,
    },
    inlineBadgeUser: {
      backgroundColor: theme.colors.mentionUserBg,
      color: theme.brand.primary,
    },
  });

function MentionBadgeInner({ token, displayName, onPress }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const isGroup = token === "here" || token === "channel";
  const label = isGroup ? `@${token}` : `@${displayName ?? token}`;

  if (onPress && !isGroup) {
    return (
      <Pressable
        testID={`mention-badge-${token}`}
        onPress={() => onPress(asUserId(token))}
        style={[styles.pressable, styles.pressableUser]}
        accessibilityRole="button"
        accessibilityLabel={`Mention ${displayName ?? token}`}
        accessibilityHint="Opens user profile"
      >
        <Text style={styles.textUser}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Text
      testID={`mention-badge-${token}`}
      style={[styles.inlineBadge, isGroup ? styles.inlineBadgeGroup : styles.inlineBadgeUser]}
    >
      {label}
    </Text>
  );
}

export const MentionBadge = memo(MentionBadgeInner);
