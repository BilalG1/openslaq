import type { AttachmentId, MessageId, UserId } from "./ids";

export interface Attachment {
  id: AttachmentId;
  messageId: MessageId | null;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: UserId | null;
  createdAt: string;
  downloadUrl: string;
}
