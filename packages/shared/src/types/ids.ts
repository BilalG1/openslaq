import { z } from "zod";

export type UserId = string & { readonly __brand: "UserId" };
export type WorkspaceId = string & { readonly __brand: "WorkspaceId" };
export type ChannelId = string & { readonly __brand: "ChannelId" };
export type MessageId = string & { readonly __brand: "MessageId" };
export type AttachmentId = string & { readonly __brand: "AttachmentId" };
export type BotAppId = string & { readonly __brand: "BotAppId" };
export type BookmarkId = string & { readonly __brand: "BookmarkId" };
export type EmojiId = string & { readonly __brand: "EmojiId" };
export type ScheduledMessageId = string & {
  readonly __brand: "ScheduledMessageId";
};
export type ApiKeyId = string & { readonly __brand: "ApiKeyId" };

export function asUserId(id: string): UserId {
  return id as UserId;
}
export function asWorkspaceId(id: string): WorkspaceId {
  return id as WorkspaceId;
}
export function asChannelId(id: string): ChannelId {
  return id as ChannelId;
}
export function asMessageId(id: string): MessageId {
  return id as MessageId;
}
export function asAttachmentId(id: string): AttachmentId {
  return id as AttachmentId;
}
export function asBotAppId(id: string): BotAppId {
  return id as BotAppId;
}
export function asBookmarkId(id: string): BookmarkId {
  return id as BookmarkId;
}
export function asEmojiId(id: string): EmojiId {
  return id as EmojiId;
}
export function asScheduledMessageId(id: string): ScheduledMessageId {
  return id as ScheduledMessageId;
}
export function asApiKeyId(id: string): ApiKeyId {
  return id as ApiKeyId;
}

/** Zod schema that parses a string and transforms it to a branded UserId. */
export function zUserId() {
  return z.string().describe("User ID").transform(asUserId);
}

/** Zod schema that parses a string and transforms it to a branded WorkspaceId. */
export function zWorkspaceId() {
  return z.string().describe("Workspace ID").transform(asWorkspaceId);
}

/** Zod schema that parses a string and transforms it to a branded ChannelId. */
export function zChannelId() {
  return z.string().describe("Channel ID").transform(asChannelId);
}

/** Zod schema that parses a string and transforms it to a branded MessageId. */
export function zMessageId() {
  return z.string().describe("Message ID").transform(asMessageId);
}

/** Zod schema that parses a string and transforms it to a branded AttachmentId. */
export function zAttachmentId() {
  return z.string().describe("Attachment ID").transform(asAttachmentId);
}

/** Zod schema that parses a string and transforms it to a branded BotAppId. */
export function zBotAppId() {
  return z.string().describe("Bot App ID").transform(asBotAppId);
}

/** Zod schema that parses a string and transforms it to a branded BookmarkId. */
export function zBookmarkId() {
  return z.string().describe("Bookmark ID").transform(asBookmarkId);
}

/** Zod schema that parses a string and transforms it to a branded EmojiId. */
export function zEmojiId() {
  return z.string().describe("Emoji ID").transform(asEmojiId);
}

/** Zod schema that parses a string and transforms it to a branded ScheduledMessageId. */
export function zScheduledMessageId() {
  return z
    .string()
    .describe("Scheduled Message ID")
    .transform(asScheduledMessageId);
}

/** Zod schema that parses a string and transforms it to a branded ApiKeyId. */
export function zApiKeyId() {
  return z.string().describe("API Key ID").transform(asApiKeyId);
}
