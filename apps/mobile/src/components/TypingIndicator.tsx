import { View, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { TypingUser } from "@/hooks/useTypingTracking";

interface Props {
  typingUsers: TypingUser[];
}

function formatTypingText(users: TypingUser[]): string {
  if (users.length === 1) {
    return `${users[0].displayName} is typing...`;
  }
  if (users.length === 2) {
    return `${users[0].displayName} and ${users[1].displayName} are typing...`;
  }
  return `${users[0].displayName} and ${users.length - 1} others are typing...`;
}

export function TypingIndicator({ typingUsers }: Props) {
  const { theme } = useMobileTheme();

  if (typingUsers.length === 0) return null;

  return (
    <View testID="typing-indicator" style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <Text
        style={{ fontSize: 12, fontStyle: 'italic', color: theme.colors.textMuted }}
      >
        {formatTypingText(typingUsers)}
      </Text>
    </View>
  );
}
