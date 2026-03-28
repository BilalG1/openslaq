import { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { UserId, MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  emoji: string;
  userIds: UserId[];
  members: { id: UserId; displayName: string }[];
  onClose: () => void;
}

export function ReactionDetailsSheet({ visible, emoji, userIds, members, onClose }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const resolvedUsers = useMemo(
    () =>
      userIds.map((uid) => {
        const member = members.find((m) => m.id === uid);
        return { id: uid, displayName: member?.displayName ?? uid };
      }),
    [userIds, members],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.emojiHeader}>
        <Text testID="reaction-details-emoji" style={styles.emojiText}>
          {emoji}
        </Text>
        <Text style={styles.countText}>{userIds.length}</Text>
      </View>
      <View style={styles.separator} />
      <ScrollView style={styles.userList} bounces={false}>
        {resolvedUsers.map((user) => (
          <View key={user.id} style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{user.displayName}</Text>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    emojiHeader: {
      alignItems: "center",
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    emojiText: {
      fontSize: 32,
    },
    countText: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.borderDefault,
      marginHorizontal: 16,
    },
    userList: {
      maxHeight: 300,
      paddingVertical: 8,
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    userAvatar: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.avatarFallbackBg,
      alignItems: "center",
      justifyContent: "center",
    },
    userInitial: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.avatarFallbackText,
    },
    userName: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
  });
