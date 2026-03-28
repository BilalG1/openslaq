import { memo, useMemo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import type { MentionCandidate } from "@/utils/message-input-utils";
import { useMobileTheme } from "@/theme/ThemeProvider";

import { TRANSPARENT } from "@/theme/constants";

/** @deprecated Use MentionCandidate from message-input-utils instead */
export type MentionSuggestionItem = MentionCandidate;

interface Props {
  suggestions: MentionCandidate[];
  onSelect: (item: MentionCandidate) => void;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: "100%",
      left: 0,
      right: 0,
      maxHeight: 200,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderColor: theme.colors.borderDefault,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: { width: 0, height: -2 },
      shadowRadius: 4,
      elevation: 4,
      zIndex: 50,
    },
    avatarCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    avatarCircleGroup: {
      backgroundColor: theme.colors.mentionGroupBg,
    },
    avatarCircleUser: {
      backgroundColor: theme.colors.surfaceTertiary,
    },
    avatarTextGroup: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.mentionGroupText,
    },
    avatarTextUser: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    displayName: {
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
  });

function MentionSuggestionListInner({ suggestions, onSelect }: Props) {
  const { theme, mode } = useMobileTheme();
  const isDark = mode === "dark";
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (suggestions.length === 0) return null;

  return (
    <View
      testID="mention-suggestion-list"
      style={[styles.container, isDark ? staticStyles.shadowDark : staticStyles.shadowLight]}
    >
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={true}
        renderItem={({ item }) => (
          <Pressable
            testID={`mention-suggestion-${item.id}`}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Mention ${item.displayName}`}
            accessibilityHint="Inserts this mention into the message"
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: pressed ? theme.colors.surfaceSelected : TRANSPARENT,
            })}
          >
            <View
              style={[
                styles.avatarCircle,
                item.isGroup ? styles.avatarCircleGroup : styles.avatarCircleUser,
              ]}
            >
              <Text
                style={item.isGroup ? styles.avatarTextGroup : styles.avatarTextUser}
              >
                {item.isGroup ? "@" : item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text
              style={styles.displayName}
              numberOfLines={1}
            >
              {item.displayName}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  shadowDark: {
    shadowOpacity: 0.3,
  },
  shadowLight: {
    shadowOpacity: 0.1,
  },
});

export const MentionSuggestionList = memo(MentionSuggestionListInner);
