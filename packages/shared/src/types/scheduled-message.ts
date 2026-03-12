import type { AttachmentId, ChannelId, MessageId, ScheduledMessageId, UserId } from "./ids";

export interface ScheduledMessage {
  id: ScheduledMessageId;
  channelId: ChannelId;
  userId: UserId;
  content: string;
  attachmentIds: AttachmentId[];
  scheduledFor: string;
  status: "pending" | "sent" | "failed";
  failureReason: string | null;
  sentMessageId: MessageId | null;
  createdAt: string;
  updatedAt: string;
}
