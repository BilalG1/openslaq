import { memo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { SlashCommandDefinition } from "@openslaq/shared";

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
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        maxHeight: 250,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderColor: theme.colors.borderDefault,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.name}
        keyboardShouldPersistTaps="always"
        renderItem={({ item }) => (
          <Pressable
            testID={`slash-command-${item.name}`}
            onPress={() => onSelect(item)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: pressed ? theme.colors.surfaceSelected : "transparent",
            })}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: theme.colors.textPrimary,
                  }}
                >
                  /{item.name}
                </Text>
                {item.source === "bot" && (
                  <View
                    testID={`slash-command-bot-badge-${item.name}`}
                    style={{
                      backgroundColor: "rgba(99, 102, 241, 0.15)",
                      borderRadius: 4,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#6366f1", fontWeight: "600" }}>
                      {item.botName ?? "Bot"}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.textSecondary,
                  marginTop: 2,
                }}
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
