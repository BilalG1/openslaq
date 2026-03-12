import type { MessageId, ChannelId, UserId, ScheduledMessageId, EmojiId, BookmarkId } from "./ids";
import type { ScheduledMessage } from "./scheduled-message";
import type { Channel } from "./channel";
import type { Message } from "./message";
import type { ReactionGroup } from "./reaction";
import type { HuddleState } from "./huddle";
import type { CustomEmoji } from "./custom-emoji";
import type { ChannelBookmark } from "./bookmark";
import type { EphemeralMessage } from "./slash-command";

export interface SocketData {
  userId: UserId;
}

// Client → Server events
export interface ClientToServerEvents {
  "channel:join": (payload: { channelId: ChannelId }) => void;
  "channel:leave": (payload: { channelId: ChannelId }) => void;
  "message:typing": (payload: { channelId: ChannelId }) => void;
}

// Server → Client events
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;
  "message:deleted": (payload: {
    id: MessageId;
    channelId: ChannelId;
  }) => void;
  "user:typing": (payload: {
    userId: UserId;
    channelId: ChannelId;
  }) => void;
  "thread:updated": (payload: {
    parentMessageId: MessageId;
    channelId: ChannelId;
    replyCount: number;
    latestReplyAt: string;
  }) => void;
  "reaction:updated": (payload: {
    messageId: MessageId;
    channelId: ChannelId;
    reactions: ReactionGroup[];
  }) => void;
  "presence:updated": (payload: {
    userId: UserId;
    status: "online" | "offline";
    lastSeenAt: string | null;
  }) => void;
  "presence:sync": (payload: {
    users: Array<{
      userId: UserId;
      status: "online" | "offline";
      lastSeenAt: string | null;
      statusEmoji?: string | null;
      statusText?: string | null;
      statusExpiresAt?: string | null;
    }>;
  }) => void;
  "user:statusUpdated": (payload: {
    userId: UserId;
    statusEmoji: string | null;
    statusText: string | null;
    statusExpiresAt: string | null;
  }) => void;
  "huddle:started": (huddle: HuddleState) => void;
  "huddle:updated": (huddle: HuddleState) => void;
  "huddle:ended": (payload: { channelId: ChannelId }) => void;
  "huddle:sync": (payload: { huddles: HuddleState[] }) => void;
  "channel:updated": (payload: { channelId: ChannelId; channel: Channel }) => void;
  "channel:member-added": (payload: { channelId: ChannelId; userId: UserId }) => void;
  "channel:member-removed": (payload: { channelId: ChannelId; userId: UserId }) => void;
  "message:pinned": (payload: { messageId: MessageId; channelId: ChannelId; pinnedBy: UserId; pinnedAt: string }) => void;
  "message:unpinned": (payload: { messageId: MessageId; channelId: ChannelId }) => void;
  "scheduledMessage:created": (payload: { id: ScheduledMessageId; channelId: ChannelId; scheduledFor: string; status: ScheduledMessage["status"] }) => void;
  "scheduledMessage:updated": (payload: { id: ScheduledMessageId; channelId: ChannelId; scheduledFor: string; status: ScheduledMessage["status"] }) => void;
  "scheduledMessage:deleted": (payload: { id: ScheduledMessageId; channelId: ChannelId }) => void;
  "scheduledMessage:sent": (payload: { id: ScheduledMessageId; channelId: ChannelId; messageId: MessageId }) => void;
  "scheduledMessage:failed": (payload: { id: ScheduledMessageId; channelId: ChannelId; failureReason: string }) => void;
  "emoji:added": (payload: { emoji: CustomEmoji }) => void;
  "emoji:deleted": (payload: { emojiId: EmojiId }) => void;
  "bookmark:added": (payload: { bookmark: ChannelBookmark }) => void;
  "bookmark:removed": (payload: { channelId: ChannelId; bookmarkId: BookmarkId }) => void;
  "command:ephemeral": (payload: EphemeralMessage) => void;
}
