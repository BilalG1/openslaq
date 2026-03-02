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

// Bot app info (returned by API)
export interface BotApp {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  webhookUrl: string;
  apiTokenPrefix: string;
  scopes: BotScope[];
  subscribedEvents: BotEventType[];
  enabled: boolean;
  createdBy: string;
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
    data: unknown;
    channelId?: string;
    userId?: string;
    timestamp: string;
  };
  interaction?: {
    actionId: string;
    value?: string;
    messageId: string;
    channelId: string;
    userId: string;
    timestamp: string;
  };
  slashCommand?: {
    command: string;
    args: string;
    channelId: string;
    userId: string;
    timestamp: string;
  };
  botAppId: string;
  workspaceId: string;
}
