import { memo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

export interface MentionSuggestionItem {
  id: string;
  displayName: string;
  isGroup?: boolean;
}

interface Props {
  suggestions: MentionSuggestionItem[];
  onSelect: (item: MentionSuggestionItem) => void;
}

function MentionSuggestionListInner({ suggestions, onSelect }: Props) {
  const { theme, mode } = useMobileTheme();
  const isDark = mode === "dark";

  if (suggestions.length === 0) return null;

  return (
    <View
      testID="mention-suggestion-list"
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        maxHeight: 200,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderColor: theme.colors.borderDefault,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 50,
      }}
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
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: pressed ? theme.colors.surfaceSelected : "transparent",
            })}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: item.isGroup
                  ? "rgba(217, 119, 6, 0.15)"
                  : theme.colors.surfaceTertiary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: item.isGroup ? "#b45309" : theme.colors.textSecondary,
                }}
              >
                {item.isGroup ? "@" : item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                color: theme.colors.textPrimary,
              }}
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

export const MentionSuggestionList = memo(MentionSuggestionListInner);
