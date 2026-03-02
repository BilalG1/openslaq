import type { AttachmentId, ChannelId, MessageId, UserId } from "./ids";

export type FileCategory = "images" | "videos" | "documents" | "audio" | "other";

export interface FileBrowserItem {
  id: AttachmentId;
  filename: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  downloadUrl: string;
  uploadedBy: UserId;
  uploaderName: string;
  channelId: ChannelId;
  channelName: string;
  messageId: MessageId;
  createdAt: string;
}
