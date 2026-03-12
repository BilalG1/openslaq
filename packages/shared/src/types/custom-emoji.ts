import type { EmojiId, WorkspaceId, UserId } from "./ids";

export interface CustomEmoji {
  id: EmojiId;
  workspaceId: WorkspaceId;
  name: string;
  url: string;
  uploadedBy: UserId;
  createdAt: string;
}
