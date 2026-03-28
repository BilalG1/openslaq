import type { UserId, ChannelId, MessageId, WorkspaceId, BotAppId } from "./ids";
import type { Message } from "./message";
import type { Channel } from "./channel";
import type { ReactionGroup } from "./reaction";

// Bot permission scopes
export type BotScope =
  | "chat:write"
  | "chat:read"
  | "channels:read"
  | "channels:write"
  | "reactions:write"
  | "reactions:read"
  | "users:read"
  | "presence:read"
  | "channels:members:read"
  | "channels:join"
  | "channels:members:write"
  | "commands:write";

// Subscribable event types
export type BotEventType =
  | "message:new"
  | "message:updated"
  | "message:deleted"
  | "reaction:updated"
  | "channel:updated"
  | "channel:member-added"
  | "channel:member-removed"
  | "message:pinned"
  | "message:unpinned"
  | "presence:updated"
  | "interaction"
  | "slash_command";

/** Maps each dispatchable webhook event type to the shape of its `data` field. */
export interface BotEventDataMap {
  "message:new": Message;
  "message:updated": Message;
  "message:deleted": { id: MessageId; channelId: ChannelId };
  "reaction:updated": { messageId: MessageId; channelId: ChannelId; reactions: ReactionGroup[] };
  "channel:updated": { channelId: ChannelId; channel: Channel };
  "channel:member-added": { channelId: ChannelId; userId: UserId };
  "channel:member-removed": { channelId: ChannelId; userId: UserId };
  "message:pinned": { messageId: MessageId; channelId: ChannelId; pinnedBy: UserId; pinnedAt: string };
  "message:unpinned": { messageId: MessageId; channelId: ChannelId };
  "presence:updated": { userId: UserId; status: "online" | "offline"; lastSeenAt: string | null };
}

/** Event types that can be dispatched via webhooks (subset of BotEventType). */
export type WebhookEventType = keyof BotEventDataMap;

// Bot app info (returned by API)
export interface BotApp {
  id: BotAppId;
  workspaceId: WorkspaceId;
  userId: UserId;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  webhookUrl: string;
  apiTokenPrefix: string;
  scopes: BotScope[];
  subscribedEvents: BotEventType[];
  enabled: boolean;
  marketplaceListingId: string | null;
  createdBy: UserId;
  createdAt: string;
}

// Interactive button definition
export interface MessageActionButton {
  id: string;
  type: "button";
  label: string;
  style?: "primary" | "danger" | "default";
  value?: string;
}

// Webhook payload sent to bot
export interface WebhookEventPayload {
  type: "event" | "interaction" | "slash_command";
  event?: {
    type: BotEventType;
    data: BotEventDataMap[WebhookEventType];
    channelId?: ChannelId;
    userId?: UserId;
    timestamp: string;
  };
  interaction?: {
    actionId: string;
    value?: string;
    messageId: MessageId;
    channelId: ChannelId;
    userId: UserId;
    timestamp: string;
  };
  slashCommand?: {
    command: string;
    args: string;
    channelId: ChannelId;
    userId: UserId;
    timestamp: string;
  };
  botAppId: BotAppId;
  workspaceId: WorkspaceId;
}
