import { View, Text } from "react-native";
import type { SharedMessageInfo } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { MessageContent } from "./MessageContent";

interface Props {
  sharedMessage: SharedMessageInfo;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SharedMessageCard({ sharedMessage }: Props) {
  const { theme } = useMobileTheme();
  const initial = sharedMessage.senderDisplayName?.charAt(0)?.toUpperCase() || "?";

  return (
    <View
      testID="shared-message-card"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: theme.brand.primary,
        borderRadius: 6,
        backgroundColor: theme.colors.surfaceSecondary,
        padding: 10,
        marginBottom: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        <View
          testID="shared-message-avatar"
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: theme.colors.surfaceTertiary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 6,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.textMuted }}>
            {initial}
          </Text>
        </View>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }} numberOfLines={1}>
          {sharedMessage.senderDisplayName}
        </Text>
        <Text style={{ flexShrink: 1, fontSize: 12, color: theme.colors.textFaint, marginLeft: 4 }} numberOfLines={1}>
          in {sharedMessage.channelType === "public" || sharedMessage.channelType === "private"
            ? `#${sharedMessage.channelName}`
            : sharedMessage.channelName}
        </Text>
        <Text style={{ fontSize: 11, color: theme.colors.textFaint, marginLeft: 6 }}>
          {formatTime(sharedMessage.createdAt)}
        </Text>
      </View>
      <MessageContent content={sharedMessage.content} />
    </View>
  );
}
