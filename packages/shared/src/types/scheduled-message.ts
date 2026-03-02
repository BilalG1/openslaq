import type { ChannelId, MessageId, UserId } from "./ids";

export interface ScheduledMessage {
  id: string;
  channelId: ChannelId;
  userId: UserId;
  content: string;
  attachmentIds: string[];
  scheduledFor: string;
  status: "pending" | "sent" | "failed";
  failureReason: string | null;
  sentMessageId: MessageId | null;
  createdAt: string;
  updatedAt: string;
}
