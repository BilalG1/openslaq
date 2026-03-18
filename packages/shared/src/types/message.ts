import type { MessageId, ChannelId, UserId } from "./ids";
import type { Attachment } from "./attachment";
import type { ReactionGroup } from "./reaction";
import type { MessageActionButton } from "./bot";
import type { ChannelType } from "./constants";

export interface Mention {
  userId: UserId;
  displayName: string;
  type: "user" | "here" | "channel";
}

export interface HuddleMessageMetadata {
  huddleStartedAt: string;
  huddleEndedAt?: string;
  duration?: number;
  finalParticipants?: string[];
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  faviconUrl: string | null;
}

export interface SharedMessageInfo {
  id: MessageId;
  channelId: ChannelId;
  channelName: string;
  channelType: ChannelType;
  userId: UserId;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

/** Fields shared by all message variants. */
interface BaseMessage {
  id: MessageId;
  channelId: ChannelId;
  userId: UserId;
  content: string;
  parentMessageId: MessageId | null;
  replyCount: number;
  latestReplyAt: string | null;
  attachments: Attachment[];
  reactions: ReactionGroup[];
  mentions: Mention[];
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  isPinned?: boolean;
  pinnedBy?: UserId | null;
  pinnedAt?: string | null;
  linkPreviews?: LinkPreview[];
  sharedMessage?: SharedMessageInfo | null;
  createdAt: string;
  updatedAt: string;
}

/** A regular (non-bot, non-huddle) message. */
export type RegularMessage = BaseMessage & {
  isBot?: false;
  botAppId?: undefined;
  actions?: undefined;
  type?: undefined;
  metadata?: undefined;
};

/** A message sent by a bot app. */
export type BotMessage = BaseMessage & {
  isBot: true;
  botAppId: string;
  actions: MessageActionButton[];
  type?: undefined;
  metadata?: undefined;
};

/** A huddle system message. */
export type HuddleMessage = BaseMessage & {
  isBot?: false;
  botAppId?: undefined;
  actions?: undefined;
  type: "huddle";
  metadata: HuddleMessageMetadata;
};

export interface ChannelEventMetadata {
  action: "joined" | "left";
}

/** A system message for channel join/leave events. */
export type ChannelEventMessage = BaseMessage & {
  isBot?: false;
  botAppId?: undefined;
  actions?: undefined;
  type: "channel_event";
  metadata: ChannelEventMetadata;
};

export type Message = RegularMessage | BotMessage | HuddleMessage | ChannelEventMessage;
