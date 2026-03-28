import { memo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { SlashCommandDefinition } from "@openslaq/shared";

import { TRANSPARENT, BOT_BADGE_BG, BOT_BADGE_TEXT } from "@/theme/constants";

interface Props {
  suggestions: SlashCommandDefinition[];
  onSelect: (item: SlashCommandDefinition) => void;
}

function SlashCommandSuggestionListInner({ suggestions, onSelect }: Props) {
  const { theme, mode } = useMobileTheme();
  const isDark = mode === "dark";

  if (suggestions.length === 0) return null;

  return (
    <View
      testID="slash-command-suggestion-list"
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderDefault,
          shadowColor: theme.colors.textPrimary,
        },
      ]}
    >
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.name}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={true}
        renderItem={({ item }) => (
          <Pressable
            testID={`slash-command-${item.name}`}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Slash command ${item.name}`}
            accessibilityHint={`Inserts the /${item.name} command`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: pressed ? theme.colors.surfaceSelected : TRANSPARENT,
            })}
          >
            <View style={styles.itemContent}>
              <View style={styles.nameRow}>
                <Text style={[styles.commandName, { color: theme.colors.textPrimary }]}>
                  /{item.name}
                </Text>
                {item.source === "bot" && (
                  <View
                    testID={`slash-command-bot-badge-${item.name}`}
                    style={styles.botBadge}
                  >
                    <Text style={styles.botBadgeText}>
                      {item.botName ?? "Bot"}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.description, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

export const SlashCommandSuggestionList = memo(SlashCommandSuggestionListInner);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    maxHeight: 250,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 50,
  },
  containerDark: {
    shadowOpacity: 0.3,
  },
  containerLight: {
    shadowOpacity: 0.1,
  },
  itemContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commandName: {
    fontSize: 15,
    fontWeight: "700",
  },
  botBadge: {
    backgroundColor: BOT_BADGE_BG,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  botBadgeText: {
    fontSize: 11,
    color: BOT_BADGE_TEXT,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
});
