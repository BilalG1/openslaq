import { View, Text } from "react-native";
import { Headphones } from "lucide-react-native";
import type { HuddleMessage } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  message: HuddleMessage;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

export function HuddleSystemMessage({ message }: Props) {
  const { theme } = useMobileTheme();
  const meta = message.metadata;
  if (!meta) return null;
  const senderName = message.senderDisplayName ?? message.userId;
  const isEnded = Boolean(meta.huddleEndedAt);

  return (
    <View
      testID="huddle-system-message"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginVertical: 4,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isEnded ? theme.colors.surfaceTertiary : "#22c55e33",
        }}
      >
        <Headphones
          size={16}
          color={isEnded ? theme.colors.textFaint : "#22c55e"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: theme.colors.textFaint }}>
          <Text style={{ fontWeight: "600" }}>{senderName}</Text> started a huddle
        </Text>
        {isEnded && meta.duration != null && (
          <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginTop: 2 }}>
            Lasted {formatDuration(meta.duration)}
          </Text>
        )}
      </View>
    </View>
  );
}
