import type { BookmarkId, ChannelId, UserId } from "./ids";

export interface ChannelBookmark {
  id: BookmarkId;
  channelId: ChannelId;
  url: string;
  title: string;
  createdBy: UserId;
  createdAt: string;
}
