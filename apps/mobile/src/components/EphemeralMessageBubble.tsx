import { View, Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import type { EphemeralMessage } from "@openslaq/shared";

interface Props {
  message: EphemeralMessage;
}

export function EphemeralMessageBubble({ message }: Props) {
  const { theme } = useMobileTheme();

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View
      testID={`ephemeral-message-${message.id}`}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "rgba(99, 102, 241, 0.06)",
        borderLeftWidth: 3,
        borderLeftColor: "#6366f1",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary }}>
          {message.senderName}
        </Text>
        <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{time}</Text>
      </View>
      <Text style={{ fontSize: 15, color: theme.colors.textPrimary, lineHeight: 20 }}>
        {message.text}
      </Text>
      <Text
        testID="ephemeral-label"
        style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4, fontStyle: "italic" }}
      >
        Only visible to you
      </Text>
    </View>
  );
}
