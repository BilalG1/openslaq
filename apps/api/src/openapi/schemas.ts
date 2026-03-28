import { z } from "@hono/zod-openapi";

// ── Common ──────────────────────────────────────────────────────────────

export const errorSchema = z
  .object({
    error: z.string().describe("Error message"),
  })
  .openapi("Error");

export const okSchema = z
  .object({
    ok: z.literal(true).describe("Success indicator"),
  })
  .openapi("Ok");

// ── Users ───────────────────────────────────────────────────────────────

export const userSchema = z
  .object({
    id: z.string().describe("User ID"),
    displayName: z.string().describe("Display name"),
    email: z.string().describe("Email address"),
    avatarUrl: z.string().nullable().describe("Avatar URL"),
    statusEmoji: z.string().nullable().describe("Custom status emoji"),
    statusText: z.string().nullable().describe("Custom status text"),
    statusExpiresAt: z.string().nullable().describe("Status expiration timestamp"),
    createdAt: z.string().describe("Creation timestamp"),
    updatedAt: z.string().describe("Last update timestamp"),
  })
  .openapi("User");

// ── Workspaces ──────────────────────────────────────────────────────────

export const workspaceSchema = z
  .object({
    id: z.string().describe("Workspace ID"),
    name: z.string().describe("Workspace name"),
    slug: z.string().describe("URL slug"),
    createdAt: z.string().describe("Creation timestamp"),
  })
  .openapi("Workspace");

export const workspaceWithRoleSchema = z
  .object({
    id: z.string().describe("Workspace ID"),
    name: z.string().describe("Workspace name"),
    slug: z.string().describe("URL slug"),
    createdAt: z.string().describe("Creation timestamp"),
    role: z.string().describe("User's role in this workspace"),
    memberCount: z.number().describe("Number of members"),
  })
  .openapi("WorkspaceWithRole");

// ── Channels ────────────────────────────────────────────────────────────

export const channelSchema = z
  .object({
    id: z.string().describe("Channel ID"),
    workspaceId: z.string().describe("Workspace ID"),
    name: z.string().describe("Channel name"),
    type: z.enum(["public", "private", "dm", "group_dm"]).describe("Channel type"),
    description: z.string().nullable().describe("Channel description"),
    displayName: z.string().nullable().describe("Display name (used for group DMs)"),
    isArchived: z.boolean().describe("Whether the channel is archived"),
    createdBy: z.string().nullable().describe("Creator user ID"),
    createdAt: z.string().describe("Creation timestamp"),
    memberCount: z.number().optional().describe("Number of members"),
  })
  .openapi("Channel");

export const browseChannelSchema = channelSchema
  .extend({
    isMember: z.boolean().describe("Whether the current user is a member"),
  })
  .openapi("BrowseChannel");

// ── Attachments ─────────────────────────────────────────────────────────

export const attachmentSchema = z
  .object({
    id: z.string().describe("Attachment ID"),
    messageId: z.string().nullable().describe("Associated message ID"),
    filename: z.string().describe("Original filename"),
    mimeType: z.string().describe("MIME type"),
    size: z.number().describe("File size in bytes"),
    uploadedBy: z.string().nullable().describe("Uploader user ID"),
    createdAt: z.string().describe("Upload timestamp"),
    downloadUrl: z.string().describe("Pre-signed download URL"),
  })
  .openapi("Attachment");

// ── Reactions ───────────────────────────────────────────────────────────

export const reactionGroupSchema = z
  .object({
    emoji: z.string().describe("Emoji character"),
    count: z.number().describe("Number of reactions"),
    userIds: z.array(z.string()).describe("User IDs who reacted"),
  })
  .openapi("ReactionGroup");

// ── Link Previews ──────────────────────────────────────────────────────

export const linkPreviewSchema = z
  .object({
    url: z.string().describe("URL"),
    title: z.string().nullable().describe("Page title"),
    description: z.string().nullable().describe("Page description"),
    imageUrl: z.string().nullable().describe("OG image URL"),
    siteName: z.string().nullable().describe("Site name"),
    faviconUrl: z.string().nullable().describe("Favicon URL"),
  })
  .openapi("LinkPreview");

// ── Shared Messages ─────────────────────────────────────────────────────

export const sharedMessageInfoSchema = z
  .object({
    id: z.string().describe("Original message ID"),
    channelId: z.string().describe("Original channel ID"),
    channelName: z.string().describe("Original channel name"),
    userId: z.string().describe("Original sender user ID"),
    senderDisplayName: z.string().describe("Original sender display name"),
    senderAvatarUrl: z.string().nullable().describe("Original sender avatar URL"),
    content: z.string().describe("Original message content"),
    createdAt: z.string().describe("Original message timestamp"),
  })
  .openapi("SharedMessageInfo");

// ── Messages ────────────────────────────────────────────────────────────

export const messageSchema = z
  .object({
    id: z.string().describe("Message ID"),
    channelId: z.string().describe("Channel ID"),
    userId: z.string().describe("Author user ID"),
    content: z.string().describe("Message content"),
    parentMessageId: z.string().nullable().describe("Parent message ID for threads"),
    replyCount: z.number().describe("Number of thread replies"),
    latestReplyAt: z.string().nullable().describe("Timestamp of latest reply"),
    attachments: z.array(attachmentSchema).describe("File attachments"),
    reactions: z.array(reactionGroupSchema).describe("Reaction groups"),
    senderDisplayName: z.string().optional().describe("Sender display name"),
    senderAvatarUrl: z.string().nullable().optional().describe("Sender avatar URL"),
    isBot: z.boolean().optional().describe("Whether message was sent by a bot"),
    botAppId: z.string().optional().describe("Bot app ID when sent by bot"),
    actions: z.array(z.object({
      id: z.string(),
      type: z.literal("button"),
      label: z.string(),
      style: z.enum(["primary", "danger", "default"]).optional(),
      value: z.string().optional(),
    })).optional().describe("Interactive action buttons for bot messages"),
    isPinned: z.boolean().optional().describe("Whether message is pinned"),
    pinnedBy: z.string().nullable().optional().describe("User who pinned the message"),
    pinnedAt: z.string().nullable().optional().describe("When the message was pinned"),
    linkPreviews: z.array(linkPreviewSchema).optional().describe("Link preview cards"),
    sharedMessage: sharedMessageInfoSchema.optional().nullable().describe("Shared/forwarded message info"),
    createdAt: z.string().describe("Creation timestamp"),
    updatedAt: z.string().describe("Last update timestamp"),
  })
  .openapi("Message");

export const messageListSchema = z
  .object({
    messages: z.array(messageSchema).describe("List of messages"),
    hasMore: z.boolean().optional().describe("Whether more messages exist"),
    nextCursor: z.string().nullable().optional().describe("Cursor for next page"),
  })
  .openapi("MessageList");

export const messagesAroundSchema = z
  .object({
    messages: z.array(messageSchema).describe("Messages around target"),
    targetFound: z.boolean().describe("Whether target message was found"),
    olderCursor: z.string().nullable().describe("Cursor for older messages"),
    newerCursor: z.string().nullable().describe("Cursor for newer messages"),
    hasOlder: z.boolean().describe("Whether older messages exist"),
    hasNewer: z.boolean().describe("Whether newer messages exist"),
  })
  .openapi("MessagesAround");

// ── Pin count ────────────────────────────────────────────────────────────

export const pinnedCountSchema = z
  .object({
    count: z.number().describe("Number of pinned messages"),
  })
  .openapi("PinnedCount");

// ── Search ──────────────────────────────────────────────────────────────

export const searchResultItemSchema = z
  .object({
    messageId: z.string().describe("Message ID"),
    channelId: z.string().describe("Channel ID"),
    channelName: z.string().describe("Channel name"),
    channelType: z.enum(["public", "private", "dm", "group_dm"]).describe("Channel type"),
    userId: z.string().describe("Author user ID"),
    userDisplayName: z.string().describe("Sender display name"),
    content: z.string().describe("Message content"),
    headline: z.string().describe("Highlighted search snippet"),
    parentMessageId: z.string().nullable().describe("Parent message ID for threads"),
    createdAt: z.string().describe("Message timestamp"),
    rank: z.number().describe("Search relevance rank"),
  })
  .openapi("SearchResultItem");

export const searchResultsSchema = z
  .object({
    results: z.array(searchResultItemSchema).describe("Matching messages"),
    total: z.number().describe("Total number of matches"),
  })
  .openapi("SearchResults");

// ── Unread counts ───────────────────────────────────────────────────────

export const unreadCountsSchema = z
  .record(z.string(), z.number())
  .describe("Map of channel IDs to unread message counts")
  .openapi("UnreadCounts");

// ── Presence ────────────────────────────────────────────────────────────

export const presenceEntrySchema = z
  .object({
    userId: z.string().describe("User ID"),
    online: z.boolean().describe("Whether user is currently online"),
    lastSeenAt: z.string().nullable().describe("Last seen timestamp"),
    statusEmoji: z.string().nullable().optional().describe("Custom status emoji"),
    statusText: z.string().nullable().optional().describe("Custom status text"),
    statusExpiresAt: z.string().nullable().optional().describe("Status expiration timestamp"),
  })
  .openapi("PresenceEntry");

// ── Workspace invites ───────────────────────────────────────────────────

export const workspaceInviteSchema = z
  .object({
    id: z.string().describe("Invite ID"),
    workspaceId: z.string().describe("Workspace ID"),
    code: z.string().describe("Invite code"),
    createdBy: z.string().describe("Creator user ID"),
    maxUses: z.number().nullable().describe("Maximum uses (null = unlimited)"),
    useCount: z.number().describe("Number of times used"),
    expiresAt: z.string().nullable().describe("Expiration timestamp"),
    revokedAt: z.string().nullable().describe("Revocation timestamp"),
    createdAt: z.string().describe("Creation timestamp"),
  })
  .openapi("WorkspaceInvite");

// ── Workspace members ───────────────────────────────────────────────────

export const workspaceMemberSchema = z
  .object({
    id: z.string().describe("User ID"),
    displayName: z.string().describe("Display name"),
    email: z.string().describe("Email address"),
    avatarUrl: z.string().nullable().describe("Avatar URL"),
    role: z.string().describe("Member role"),
    createdAt: z.string().describe("User creation timestamp"),
    joinedAt: z.string().describe("When they joined the workspace"),
  })
  .openapi("WorkspaceMember");

// ── Channel members ─────────────────────────────────────────────────────

export const channelMemberSchema = z
  .object({
    id: z.string().describe("User ID"),
    displayName: z.string().describe("Display name"),
    email: z.string().describe("Email address"),
    avatarUrl: z.string().nullable().describe("Avatar URL"),
    joinedAt: z.string().describe("When they joined the channel"),
  })
  .openapi("ChannelMember");

// ── DM ──────────────────────────────────────────────────────────────────

export const dmUserSchema = z
  .object({
    id: z.string().describe("User ID"),
    displayName: z.string().describe("Display name"),
    email: z.string().describe("Email address"),
    avatarUrl: z.string().nullable().describe("Avatar URL"),
  })
  .openapi("DmUser");

export const dmChannelResponseSchema = z
  .object({
    channel: channelSchema.describe("DM channel"),
    otherUser: dmUserSchema.nullable().describe("Other user in the DM"),
  })
  .openapi("DmChannelResponse");

export const dmListItemSchema = z
  .object({
    channel: channelSchema.describe("DM channel"),
    otherUser: dmUserSchema.describe("Other user in the DM"),
    lastMessageContent: z.string().nullable().describe("Content of the last message"),
    lastMessageAt: z.string().nullable().describe("Timestamp of the last message"),
  })
  .openapi("DmListItem");

// ── Group DMs ──────────────────────────────────────────────────────────

export const groupDmMemberSchema = z
  .object({
    id: z.string().describe("User ID"),
    displayName: z.string().describe("Display name"),
    avatarUrl: z.string().nullable().describe("Avatar URL"),
  })
  .openapi("GroupDmMember");

export const groupDmResponseSchema = z
  .object({
    channel: channelSchema.describe("Group DM channel"),
    members: z.array(groupDmMemberSchema).describe("Group DM members"),
  })
  .openapi("GroupDmResponse");

export const groupDmListItemSchema = z
  .object({
    channel: channelSchema.describe("Group DM channel"),
    members: z.array(groupDmMemberSchema).describe("Group DM members"),
  })
  .openapi("GroupDmListItem");

// ── Uploads ─────────────────────────────────────────────────────────────

export const uploadResponseSchema = z
  .object({
    attachments: z.array(attachmentSchema).describe("Uploaded file attachments"),
  })
  .openapi("UploadResponse");

// ── Reactions response ──────────────────────────────────────────────────

export const reactionsResponseSchema = z
  .object({
    reactions: z.array(reactionGroupSchema).describe("Updated reaction groups"),
  })
  .openapi("ReactionsResponse");

// ── Invite preview / accept ─────────────────────────────────────────────

export const invitePreviewSchema = z
  .object({
    workspaceName: z.string().describe("Workspace name"),
    workspaceSlug: z.string().describe("Workspace slug"),
    alreadyMember: z.boolean().describe("Whether the user is already a workspace member"),
  })
  .openapi("InvitePreview");

export const inviteAcceptSchema = z
  .object({
    slug: z.string().describe("Workspace slug"),
  })
  .openapi("InviteAccept");
