import type { ChannelEventMessage } from "@openslaq/shared";

interface ChannelEventSystemMessageProps {
  message: ChannelEventMessage;
}

export function ChannelEventSystemMessage({ message }: ChannelEventSystemMessageProps) {
  const senderName = message.senderDisplayName ?? message.userId;
  const action = message.metadata.action === "joined" ? "joined" : "left";

  return (
    <div className="text-center text-xs text-faint py-2" data-testid="channel-event-system-message">
      <span className="font-semibold">{senderName}</span> {action} the channel
    </div>
  );
}
