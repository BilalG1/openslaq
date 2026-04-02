import { View, Text, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { TypingUser } from "@/hooks/useTypingTracking";

interface Props {
  typingUsers: TypingUser[];
}

function formatTypingText(users: TypingUser[]): string {
  if (users.length === 1) {
    return `${users[0]!.displayName} is typing...`;
  }
  if (users.length === 2) {
    return `${users[0]!.displayName} and ${users[1]!.displayName} are typing...`;
  }
  return `${users[0]!.displayName} and ${users.length - 1} others are typing...`;
}

export function TypingIndicator({ typingUsers }: Props) {
  const { theme } = useMobileTheme();
  const hasTypers = typingUsers.length > 0;

  return (
    <View testID="typing-indicator" style={[staticStyles.container, !hasTypers && staticStyles.hidden]}>
      {hasTypers && (
        <Text
          style={[staticStyles.text, { color: theme.colors.textMuted }]}
        >
          {formatTypingText(typingUsers)}
        </Text>
      )}
    </View>
  );
}

/** Apply to the View wrapping TypingIndicator + MessageInput so absolute positioning works. */
export const typingIndicatorWrapperStyle = { position: "relative" as const };

const staticStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  hidden: {
    opacity: 0,
  },
  text: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
