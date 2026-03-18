import { View, Text } from "react-native";
import type { ChannelEventMessage } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  message: ChannelEventMessage;
}

export function ChannelEventSystemMessage({ message }: Props) {
  const { theme } = useMobileTheme();
  const senderName = message.senderDisplayName ?? message.userId;
  const action = message.metadata.action === "joined" ? "joined" : "left";

  return (
    <View
      testID="channel-event-system-message"
      style={{ alignItems: "center", paddingVertical: 8 }}
    >
      <Text style={{ fontSize: 12, color: theme.colors.textFaint }}>
        <Text style={{ fontWeight: "600" }}>{senderName}</Text> {action} the channel
      </Text>
    </View>
  );
}
