/**
 * SDK types — derived from @openslaq/shared where possible.
 * All IDs are plain strings (no branded types).
 */

import type {
  Attachment as SharedAttachment,
  ReactionGroup as SharedReactionGroup,
  Mention as SharedMention,
  LinkPreview,
  HuddleMessageMetadata,
  SharedMessageInfo as SharedSharedMessageInfo,
  Channel as SharedChannel,
  User as SharedUser,
  FileBrowserItem as SharedFileBrowserItem,
  SearchResultItem as SharedSearchResultItem,
  SearchResult as SharedSearchResult,
  ChannelType,
  ChannelNotifyLevel,
  FileCategory,
} from "@openslaq/shared";

/**
 * Recursively strips branded ID types to plain strings.
 * Branded IDs in shared are `string & { readonly __brand: string }`.
 */
type Unbrand<T> =
  T extends string & { readonly __brand: string } ? string :
  T extends Array<infer U> ? Unbrand<U>[] :
  T extends object ? { [K in keyof T]: Unbrand<T[K]> } :
  T;

// --- Derived types (same shape, branded IDs → plain strings) ---

export type Attachment = Unbrand<SharedAttachment>;
export type ReactionGroup = Unbrand<SharedReactionGroup>;
export type Mention = Unbrand<SharedMention>;
export type { LinkPreview, HuddleMessageMetadata };
export type SharedMessageInfo = Unbrand<SharedSharedMessageInfo>;
export type Channel = Unbrand<SharedChannel>;
export type User = Unbrand<SharedUser>;
export type FileBrowserItem = Unbrand<SharedFileBrowserItem>;
export type SearchResult = Unbrand<SharedSearchResultItem>;
export type SearchResponse = Unbrand<SharedSearchResult>;
export type { ChannelType, ChannelNotifyLevel, FileCategory };

// --- SDK-only types (structural differences or SDK-specific) ---

export interface MessageActionButton {
  label: string;
  value: string;
  style?: "primary" | "danger";
}

/** Flat message interface — union of all message variants. */
export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  parentMessageId: string | null;
  replyCount: number;
  latestReplyAt: string | null;
  attachments: Attachment[];
  reactions: ReactionGroup[];
  mentions: Mention[];
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  isPinned?: boolean;
  pinnedBy?: string | null;
  pinnedAt?: string | null;
  linkPreviews?: LinkPreview[];
  sharedMessage?: SharedMessageInfo | null;
  isBot?: boolean;
  botAppId?: string;
  actions?: MessageActionButton[];
  type?: string;
  metadata?: HuddleMessageMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface MessageListResponse {
  messages: Message[];
  nextCursor: string | null;
}

export interface BrowseChannel extends Channel {
  isMember: boolean;
}

export interface ChannelMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface MarkUnreadResponse {
  ok: boolean;
  unreadCount: number;
}

export interface ToggleReactionResponse {
  reactions: ReactionGroup[];
}

export interface NotificationPrefsMap {
  [channelId: string]: ChannelNotifyLevel;
}

// DMs
export interface DmUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface DmChannel {
  channel: Channel;
  otherUser: DmUser;
}

export interface OpenDmResponse {
  channel: Channel;
  otherUser: DmUser | null;
}

// Files
export interface BrowseFilesResponse {
  files: FileBrowserItem[];
  nextCursor: string | null;
}

export interface UploadResponse {
  attachments: Attachment[];
}

// Pins
export interface PinnedMessagesResponse {
  messages: Message[];
}

export interface PinCountResponse {
  count: number;
}

// Saved messages
export interface SavedMessage {
  message: Message;
  channelName: string;
  savedAt: string;
}

export interface SavedMessagesResponse {
  messages: SavedMessage[];
}

export interface SavedMessageIdsResponse {
  messageIds: string[];
}

// Scheduled messages
export interface ScheduledMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  attachmentIds: string[];
  scheduledFor: string;
  status: "pending" | "sent" | "failed";
  failureReason: string | null;
  sentMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledMessageWithChannel extends ScheduledMessage {
  channelName: string;
}

// Messages around
export interface MessagesAroundResponse {
  messages: Message[];
  targetFound: boolean;
  olderCursor: string | null;
  newerCursor: string | null;
  hasOlder: boolean;
  hasNewer: boolean;
}

// Share options
export interface ShareMessageOptions {
  sharedMessageId: string;
  comment?: string;
}

// Group DMs
export interface GroupDmMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface GroupDmChannel {
  channel: Channel;
  members: GroupDmMember[];
}

export interface GroupDmAddMemberResponse {
  members: GroupDmMember[];
}

// Presence
export interface PresenceEntry {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
  statusEmoji: string | null;
  statusText: string | null;
  statusExpiresAt: string | null;
}
