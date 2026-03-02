import type { ChannelId, UserId } from "./ids";

export interface SlashCommandDefinition {
  name: string;
  description: string;
  usage: string;
  source: "builtin" | "bot";
  botAppId?: string;
  botName?: string;
}

export interface EphemeralMessage {
  id: string;
  channelId: ChannelId;
  text: string;
  senderName: string;
  senderAvatarUrl: string | null;
  createdAt: string;
  ephemeral: true;
}

export interface SlashCommandExecuteRequest {
  command: string;
  args: string;
  channelId: string;
}

export interface SlashCommandExecuteResponse {
  ok: boolean;
  ephemeralMessages?: EphemeralMessage[];
  error?: string;
}

export interface Reminder {
  id: string;
  userId: UserId;
  channelId: ChannelId;
  text: string;
  remindAt: string;
  status: "pending" | "sent" | "cancelled";
  createdAt: string;
}
