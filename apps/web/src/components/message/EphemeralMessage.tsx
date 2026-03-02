import type { EphemeralMessage as EphemeralMessageType } from "@openslaq/shared";

interface EphemeralMessageProps {
  message: EphemeralMessageType;
}

export function EphemeralMessageItem({ message }: EphemeralMessageProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="px-4 py-2 opacity-70" data-testid="ephemeral-message">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-semibold text-sm text-primary">{message.senderName}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-faint">
          Only visible to you
        </span>
        <span className="text-xs text-faint">{time}</span>
      </div>
      <div className="text-sm text-secondary whitespace-pre-wrap">{message.text}</div>
    </div>
  );
}
