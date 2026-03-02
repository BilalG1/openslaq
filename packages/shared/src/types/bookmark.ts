import type { ChannelId, UserId } from "./ids";

export interface ChannelBookmark {
  id: string;
  channelId: ChannelId;
  url: string;
  title: string;
  createdBy: UserId;
  createdAt: string;
}
