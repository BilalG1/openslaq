import { useMemo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Star, StarOff } from "lucide-react-native";
import { TRANSPARENT } from "@/theme/constants";

interface Props {
  visible: boolean;
  channelId: string | null;
  displayName: string;
  isStarred: boolean;
  onStar: (channelId: string) => void;
  onUnstar: (channelId: string) => void;
  onClose: () => void;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    name: {
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
    actionRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    actionText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
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

export function DmActionSheet({
  visible,
  channelId,
  displayName,
  isStarred,
  onStar,
  onUnstar,
  onClose,
}: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!channelId) return null;

  const handleStar = () => {
    haptics.selection();
    onClose();
    if (isStarred) {
      onUnstar(channelId);
    } else {
      onStar(channelId);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="dm-action-sheet-content">
      <Text style={styles.name}>{displayName}</Text>
      <View style={styles.divider} />

      <Pressable
        testID={isStarred ? "action-unstar-dm" : "action-star-dm"}
        onPress={handleStar}
        accessibilityLabel={isStarred ? "Unstar conversation" : "Star conversation"}
        accessibilityHint={isStarred ? "Removes the conversation from your starred list" : "Adds the conversation to your starred list"}
        style={({ pressed }) => pressed ? styles.actionButtonPressed : styles.actionButtonDefault}
      >
        <View style={styles.actionRow}>
          {isStarred ? <StarOff size={20} color={theme.colors.textPrimary} /> : <Star size={20} color={theme.colors.textPrimary} />}
          <Text style={styles.actionText}>
            {isStarred ? "Unstar" : "Star"}
          </Text>
        </View>
      </Pressable>
    </BottomSheet>
  );
}
