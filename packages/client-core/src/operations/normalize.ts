import {
  asAttachmentId,
  asChannelId,
  asMessageId,
  asUserId,
  asWorkspaceId,
} from "@openslaq/shared";
import type { Channel, Message, Role } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation, GroupDmMember, WorkspaceInfo } from "../chat-reducer";

interface RawWorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  role: string;
  memberCount?: number;
}

interface RawChannel {
  id: string;
  workspaceId: string;
  name: string;
  type: Channel["type"];
  description: string | null;
  displayName?: string | null;
  isArchived?: boolean;
  createdBy: string | null;
  createdAt: string;
  memberCount?: number;
}

interface RawDmConversation {
  channel: RawChannel;
  otherUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface RawMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  parentMessageId: string | null;
  replyCount: number;
  latestReplyAt: string | null;
  attachments?: Array<{
    id: string;
    messageId: string | null;
    filename: string;
    mimeType: string;
    size: number;
    uploadedBy: string | null;
    createdAt: string;
    downloadUrl: string;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  mentions?: Array<{
    userId: string;
    displayName: string;
    type: "user" | "here" | "channel";
  }>;
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  sharedMessage?: {
    id: string;
    channelId: string;
    channelName: string;
    channelType?: Channel["type"];
    userId: string;
    senderDisplayName: string;
    senderAvatarUrl: string | null;
    content: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeWorkspaceInfo(workspace: RawWorkspaceInfo): WorkspaceInfo {
  return {
    id: asWorkspaceId(workspace.id),
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt,
    role: workspace.role as Role,
  };
}

export function normalizeChannel(channel: RawChannel): Channel {
  return {
    id: asChannelId(channel.id),
    workspaceId: asWorkspaceId(channel.workspaceId),
    name: channel.name,
    type: channel.type,
    description: channel.description,
    displayName: channel.displayName ?? null,
    isArchived: channel.isArchived ?? false,
    createdBy: channel.createdBy ? asUserId(channel.createdBy) : null,
    createdAt: channel.createdAt,
    memberCount: channel.memberCount,
  };
}

export function normalizeDmConversation(dm: RawDmConversation): DmConversation {
  return {
    channel: normalizeChannel(dm.channel),
    otherUser: dm.otherUser,
  };
}

interface RawGroupDmConversation {
  channel: RawChannel;
  members: GroupDmMember[];
}

export function normalizeGroupDmConversation(gdm: RawGroupDmConversation): GroupDmConversation {
  return {
    channel: normalizeChannel(gdm.channel),
    members: gdm.members,
  };
}

export function normalizeMessage(message: RawMessage): Message {
  return {
    id: asMessageId(message.id),
    channelId: asChannelId(message.channelId),
    userId: asUserId(message.userId),
    content: message.content,
    parentMessageId: message.parentMessageId ? asMessageId(message.parentMessageId) : null,
    replyCount: message.replyCount,
    latestReplyAt: message.latestReplyAt,
    attachments: (message.attachments ?? []).map((attachment) => ({
      id: asAttachmentId(attachment.id),
      messageId: attachment.messageId ? asMessageId(attachment.messageId) : null,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploadedBy: attachment.uploadedBy ? asUserId(attachment.uploadedBy) : null,
      createdAt: attachment.createdAt,
      downloadUrl: attachment.downloadUrl,
    })),
    reactions: (message.reactions ?? []).map((reaction) => ({
      emoji: reaction.emoji,
      count: reaction.count,
      userIds: reaction.userIds.map(asUserId),
    })),
    mentions: (message.mentions ?? []).map((mention) => ({
      userId: asUserId(mention.userId),
      displayName: mention.displayName,
      type: mention.type,
    })),
    senderDisplayName: message.senderDisplayName,
    senderAvatarUrl: message.senderAvatarUrl,
    ...(message.sharedMessage ? {
      sharedMessage: {
        id: asMessageId(message.sharedMessage.id),
        channelId: asChannelId(message.sharedMessage.channelId),
        channelName: message.sharedMessage.channelName,
        channelType: message.sharedMessage.channelType ?? "public",
        userId: asUserId(message.sharedMessage.userId),
        senderDisplayName: message.sharedMessage.senderDisplayName,
        senderAvatarUrl: message.sharedMessage.senderAvatarUrl,
        content: message.sharedMessage.content,
        createdAt: message.sharedMessage.createdAt,
      },
    } : {}),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

export function normalizeCursor(cursor: string | null | undefined): string | null {
  return cursor ?? null;
}
