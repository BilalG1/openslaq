import type { SharedMessageInfo } from "@openslaq/shared";
import { Avatar } from "../ui";
import { MessageContent } from "./MessageContent";

interface SharedMessageBlockProps {
  sharedMessage: SharedMessageInfo;
}

export function SharedMessageBlock({ sharedMessage }: SharedMessageBlockProps) {
  return (
    <div
      data-testid="shared-message-block"
      className="border-l-4 border-slaq-blue/40 pl-3 py-1.5 my-1 bg-surface-secondary/30 rounded-r"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Avatar
          src={sharedMessage.senderAvatarUrl}
          fallback={sharedMessage.senderDisplayName}
          size="sm"
          shape="rounded"
        />
        <span className="font-semibold text-xs text-primary">
          {sharedMessage.senderDisplayName}
        </span>
        <span className="text-[10px] text-faint">
          in {sharedMessage.channelType === "public" || sharedMessage.channelType === "private"
            ? `#${sharedMessage.channelName}`
            : sharedMessage.channelName}
        </span>
        <span className="text-[10px] text-faint">
          {new Date(sharedMessage.createdAt).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
      {sharedMessage.content && (
        <div className="text-sm text-primary">
          <MessageContent content={sharedMessage.content} mentions={[]} />
        </div>
      )}
    </div>
  );
}
