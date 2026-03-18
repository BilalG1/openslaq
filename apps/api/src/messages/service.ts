import { eq, and, desc, asc, isNull, inArray, sql, count, max } from "drizzle-orm";
import { db } from "../db";
import { messages } from "./schema";
import { users } from "../users/schema";
import {
  linkAttachmentsToMessage,
  getAttachmentsForMessages,
  deleteAttachmentsForMessage,
} from "../uploads/service";
import { getPresignedDownloadUrl } from "../uploads/s3";
import { getReactionsForMessages } from "../reactions/service";
import { storeMentions, deleteMentions, batchMentions } from "./mentions";
import type {
  Message,
  BotMessage,
  HuddleMessage,
  ChannelEventMessage,
  RegularMessage,
  Mention,
  LinkPreview,
  SharedMessageInfo,
  Attachment,
  ReactionGroup,
  MessageActionButton,
  HuddleMessageMetadata,
  ChannelEventMetadata,
  ChannelType,
  MessageId,
  ChannelId,
  UserId,
} from "@openslaq/shared";
import {
  asMessageId,
  asChannelId,
  asUserId,
  asAttachmentId,
} from "@openslaq/shared";
import { getMessageActionsForMessages } from "../bots/service";
import { batchPinStatus } from "./pinned-service";
import { batchLinkPreviews } from "./link-preview-service";
import { channels } from "../channels/schema";

// --- DB type aliases ---

type DbAttachment = Awaited<ReturnType<typeof getAttachmentsForMessages>>[number];

// --- Serialization ---

function toAttachment(a: DbAttachment): Attachment {
  return {
    id: asAttachmentId(a.id),
    messageId: a.messageId ? asMessageId(a.messageId) : null,
    filename: a.filename,
    mimeType: a.mimeType,
    size: a.size,
    uploadedBy: a.uploadedBy ? asUserId(a.uploadedBy) : null,
    createdAt: a.createdAt.toISOString(),
    downloadUrl: getPresignedDownloadUrl(a.storageKey),
  };
}

function toMessage(
  m: typeof messages.$inferSelect,
  attachments: DbAttachment[],
  threadMeta?: { replyCount: number; latestReplyAt: Date | null },
  reactions: ReactionGroup[] = [],
  sender?: { displayName: string; avatarUrl: string | null },
  mentions: Mention[] = [],
  botInfo?: { botAppId: string; actions: MessageActionButton[] },
  pinInfo?: { pinnedBy: string; pinnedAt: Date },
  linkPreviews?: LinkPreview[],
  sharedMessage?: SharedMessageInfo,
): Message {
  const base = {
    id: asMessageId(m.id),
    channelId: asChannelId(m.channelId),
    userId: asUserId(m.userId),
    content: m.content,
    parentMessageId: m.parentMessageId ? asMessageId(m.parentMessageId) : null,
    replyCount: threadMeta?.replyCount ?? 0,
    latestReplyAt: threadMeta?.latestReplyAt?.toISOString() ?? null,
    attachments: attachments.map(toAttachment),
    reactions,
    mentions,
    senderDisplayName: sender?.displayName,
    senderAvatarUrl: sender?.avatarUrl ?? null,
    ...(pinInfo ? { isPinned: true, pinnedBy: asUserId(pinInfo.pinnedBy), pinnedAt: pinInfo.pinnedAt.toISOString() } : {}),
    ...(linkPreviews?.length ? { linkPreviews } : {}),
    ...(sharedMessage ? { sharedMessage } : {}),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };

  const isBot = m.userId.startsWith("bot:");

  if (isBot) {
    return {
      ...base,
      isBot: true,
      botAppId: botInfo?.botAppId ?? "",
      actions: botInfo?.actions ?? [],
    } satisfies BotMessage;
  }

  if (m.type === "huddle" && m.metadata) {
    return {
      ...base,
      type: "huddle",
      metadata: m.metadata as HuddleMessageMetadata,
    } satisfies HuddleMessage;
  }

  if (m.type === "channel_event" && m.metadata) {
    return {
      ...base,
      type: "channel_event",
      metadata: m.metadata as ChannelEventMetadata,
    } satisfies ChannelEventMessage;
  }

  return base satisfies RegularMessage;
}

// --- Data fetching helpers ---

async function batchAttachments(messageIds: string[]) {
  const allAttachments = await getAttachmentsForMessages(messageIds);
  const byMessage = new Map<string, typeof allAttachments>();
  for (const att of allAttachments) {
    if (!att.messageId) continue;
    const list = byMessage.get(att.messageId) ?? [];
    list.push(att);
    byMessage.set(att.messageId, list);
  }
  return byMessage;
}

async function batchThreadMeta(messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, { replyCount: number; latestReplyAt: Date | null }>();

  const rows = await db
    .select({
      parentMessageId: messages.parentMessageId,
      replyCount: count(),
      latestReplyAt: max(messages.createdAt),
    })
    .from(messages)
    .where(inArray(messages.parentMessageId, messageIds))
    .groupBy(messages.parentMessageId);

  const map = new Map<string, { replyCount: number; latestReplyAt: Date | null }>();
  for (const row of rows) {
    if (row.parentMessageId) {
      map.set(row.parentMessageId, {
        replyCount: row.replyCount,
        latestReplyAt: row.latestReplyAt,
      });
    }
  }
  return map;
}

async function batchReactions(messageIds: string[]) {
  return getReactionsForMessages(messageIds);
}

type SenderInfo = { displayName: string; avatarUrl: string | null };

async function batchSenders(
  messageRows: { userId: string }[],
): Promise<Map<string, SenderInfo>> {
  const uniqueUserIds = [...new Set(messageRows.map((m) => m.userId))];
  if (uniqueUserIds.length === 0) return new Map();

  const rows = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, uniqueUserIds));

  const map = new Map<string, SenderInfo>();
  for (const row of rows) {
    map.set(row.id, { displayName: row.displayName, avatarUrl: row.avatarUrl });
  }
  return map;
}

async function batchBotInfo(messageRows: { id: string; userId: string }[]) {
  const botMessageIds = messageRows.filter((m) => m.userId.startsWith("bot:")).map((m) => m.id);
  if (botMessageIds.length === 0) return new Map<string, { botAppId: string; actions: MessageActionButton[] }>();
  return getMessageActionsForMessages(botMessageIds);
}

async function batchSharedMessages(
  messageRows: { id: string; sharedMessageId: string | null }[],
): Promise<Map<string, SharedMessageInfo>> {
  const entries = messageRows.filter((m) => m.sharedMessageId != null);
  if (entries.length === 0) return new Map();

  const sharedIds = [...new Set(entries.map((m) => m.sharedMessageId!))];

  const rows = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      channelType: channels.type,
      channelDisplayName: channels.displayName,
      userId: messages.userId,
      content: messages.content,
      createdAt: messages.createdAt,
      senderDisplayName: users.displayName,
      senderAvatarUrl: users.avatarUrl,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.userId))
    .innerJoin(channels, eq(channels.id, messages.channelId))
    .where(inArray(messages.id, sharedIds));

  const infoById = new Map<string, SharedMessageInfo>();
  for (const row of rows) {
    const channelType = row.channelType as ChannelType;
    let channelName: string;
    if (channelType === "dm") {
      channelName = "a direct message";
    } else if (channelType === "group_dm") {
      channelName = row.channelDisplayName ?? "a group message";
    } else {
      channelName = row.channelName;
    }

    infoById.set(row.id, {
      id: asMessageId(row.id),
      channelId: asChannelId(row.channelId),
      channelName,
      channelType,
      userId: asUserId(row.userId),
      senderDisplayName: row.senderDisplayName,
      senderAvatarUrl: row.senderAvatarUrl,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    });
  }

  // Map from the referencing message id → SharedMessageInfo
  const result = new Map<string, SharedMessageInfo>();
  for (const entry of entries) {
    const info = infoById.get(entry.sharedMessageId!);
    if (info) result.set(entry.id, info);
  }
  return result;
}

// --- Hydration ---

export type DbMessageRow = typeof messages.$inferSelect;

export async function hydrateMessages(rows: DbMessageRow[], opts?: { skipThreadMeta?: boolean }): Promise<Message[]> {
  if (rows.length === 0) return [];
  const messageIds = rows.map((m) => m.id);
  const [attachmentsByMessage, threadMeta, reactionsByMessage, sendersByUser, mentionsByMessage, botInfoByMessage, pinStatusByMessage, linkPreviewsByMessage, sharedMessagesByMessage] = await Promise.all([
    batchAttachments(messageIds),
    opts?.skipThreadMeta ? new Map() : batchThreadMeta(messageIds),
    batchReactions(messageIds),
    batchSenders(rows),
    batchMentions(messageIds),
    batchBotInfo(rows),
    batchPinStatus(messageIds),
    batchLinkPreviews(messageIds),
    batchSharedMessages(rows),
  ]);
  return rows.map((m) =>
    toMessage(m, attachmentsByMessage.get(m.id) ?? [], threadMeta.get(m.id), reactionsByMessage.get(m.id) ?? [], sendersByUser.get(m.userId), mentionsByMessage.get(m.id) ?? [], botInfoByMessage.get(m.id), pinStatusByMessage.get(m.id), linkPreviewsByMessage.get(m.id), sharedMessagesByMessage.get(m.id)),
  );
}

// --- Public API ---

export async function getMessages(
  channelId: ChannelId,
  cursor?: string,
  limit = 50,
  direction: "older" | "newer" = "older",
): Promise<{ messages: Message[]; nextCursor: MessageId | null }> {
  const conditions = [eq(messages.channelId, channelId), isNull(messages.parentMessageId)];
  if (cursor) {
    // Compare directly in SQL to preserve microsecond precision
    // (JavaScript Date truncates to milliseconds, causing gt()/lt() to include the cursor row)
    conditions.push(
      direction === "newer"
        ? sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${cursor})`
        : sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${cursor})`,
    );
  }

  const result = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: direction === "newer" ? asc(messages.createdAt) : desc(messages.createdAt),
    limit: limit + 1,
  });

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  const serialized = await hydrateMessages(items);

  return {
    messages: serialized,
    nextCursor: hasMore ? asMessageId(items[items.length - 1]!.id) : null,
  };
}

export async function getMessagesByIds(messageIds: MessageId[]): Promise<Message[]> {
  if (messageIds.length === 0) return [];
  const rows = await db.query.messages.findMany({
    where: inArray(messages.id, messageIds),
  });
  return hydrateMessages(rows);
}

export async function getMessageById(messageId: MessageId): Promise<Message | null> {
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!message) return null;

  const [hydrated] = await hydrateMessages([message]);
  return hydrated ?? null;
}

export async function getThreadReplies(
  parentMessageId: MessageId,
  channelId: ChannelId,
  cursor?: string,
  limit = 50,
  direction: "older" | "newer" = "older",
): Promise<{ messages: Message[]; nextCursor: MessageId | null }> {
  const conditions = [
    eq(messages.parentMessageId, parentMessageId),
    eq(messages.channelId, channelId),
  ];
  if (cursor) {
    // Compare directly in SQL to preserve microsecond precision
    // (JavaScript Date truncates to milliseconds, causing gt()/lt() to include the cursor row)
    conditions.push(
      direction === "newer"
        ? sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${cursor})`
        : sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${cursor})`,
    );
  }

  const result = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: direction === "newer" ? asc(messages.createdAt) : desc(messages.createdAt),
    limit: limit + 1,
  });

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  // Replies don't need thread meta (no nested threads)
  const serialized = await hydrateMessages(items, { skipThreadMeta: true });

  return {
    messages: serialized,
    nextCursor: hasMore ? asMessageId(items[items.length - 1]!.id) : null,
  };
}

export async function getMessagesAround(
  channelId: ChannelId,
  targetMessageId: MessageId,
  limit = 25,
): Promise<{
  messages: Message[];
  targetFound: boolean;
  olderCursor: MessageId | null;
  newerCursor: MessageId | null;
  hasOlder: boolean;
  hasNewer: boolean;
}> {
  // Find the target message's createdAt
  const target = await db.query.messages.findFirst({
    where: and(eq(messages.id, targetMessageId), eq(messages.channelId, channelId)),
  });

  if (!target) {
    return { messages: [], targetFound: false, olderCursor: null, newerCursor: null, hasOlder: false, hasNewer: false };
  }

  // Fetch messages before and after (including the target), top-level only
  // Fetch limit+1 to detect if there are more in each direction
  const beforeRows = await db.query.messages.findMany({
    where: and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId),
      sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${targetMessageId})`,
    ),
    orderBy: desc(messages.createdAt),
    limit: limit + 1,
  });

  const afterRows = await db.query.messages.findMany({
    where: and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId),
      sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${targetMessageId})`,
    ),
    orderBy: asc(messages.createdAt),
    limit: limit + 1,
  });

  const hasOlder = beforeRows.length > limit;
  const hasNewer = afterRows.length > limit;
  const trimmedBefore = hasOlder ? beforeRows.slice(0, limit) : beforeRows;
  const trimmedAfter = hasNewer ? afterRows.slice(0, limit) : afterRows;

  // If the target is a reply, include the parent message context;
  // if it's top-level, include it directly
  const targetRow = target.parentMessageId
    ? await db.query.messages.findFirst({ where: eq(messages.id, target.parentMessageId) })
    : target;

  const allRows = [...trimmedBefore.reverse(), ...(targetRow ? [targetRow] : []), ...trimmedAfter];
  // Deduplicate (target may overlap with before/after)
  const seen = new Set<string>();
  const uniqueRows = allRows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const serialized = await hydrateMessages(uniqueRows);

  const olderCursor = uniqueRows.length > 0 ? asMessageId(uniqueRows[0]!.id) : null;
  const newerCursor = uniqueRows.length > 0 ? asMessageId(uniqueRows[uniqueRows.length - 1]!.id) : null;

  return { messages: serialized, targetFound: true, olderCursor, newerCursor, hasOlder, hasNewer };
}

export async function createMessage(
  channelId: ChannelId,
  userId: UserId,
  content: string,
  attachmentIds: string[] = [],
): Promise<Message | { error: string }> {
  let message: typeof messages.$inferSelect;
  try {
    message = await db.transaction(async (tx) => {
      const [msg] = await tx
        .insert(messages)
        .values({ channelId, userId, content })
        .returning();

      if (!msg) throw new Error("Failed to insert message");

      if (attachmentIds.length > 0) {
        const linked = await linkAttachmentsToMessage(attachmentIds, msg.id, userId, tx);
        if (linked !== attachmentIds.length) {
          throw new Error("ATTACHMENT_LINK_ERROR");
        }
      }

      return msg;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ATTACHMENT_LINK_ERROR") {
      return { error: "One or more attachments are invalid or already linked" };
    }
    throw e;
  }

  // Store mentions outside the transaction (non-critical)
  await storeMentions(message.id, channelId, userId, content);

  const [messageAttachments, sendersByUser, mentionsByMessage, botInfoByMessage] = await Promise.all([
    getAttachmentsForMessages([message.id]),
    batchSenders([message]),
    batchMentions([message.id]),
    batchBotInfo([message]),
  ]);
  return toMessage(message, messageAttachments, undefined, [], sendersByUser.get(message.userId), mentionsByMessage.get(message.id) ?? [], botInfoByMessage.get(message.id));
}

export type ThreadReplyResult =
  | {
      reply: Message;
      threadUpdate: {
        parentMessageId: MessageId;
        channelId: ChannelId;
        replyCount: number;
        latestReplyAt: string;
      };
    }
  | { error: "Parent message not found" | "Cannot reply to a reply" | "Parent message not in this channel" | "One or more attachments are invalid or already linked" };

export async function createThreadReply(
  parentMessageId: MessageId,
  channelId: ChannelId,
  userId: UserId,
  content: string,
  attachmentIds: string[] = [],
): Promise<ThreadReplyResult> {
  // Verify parent exists and is a top-level message
  const parent = await db.query.messages.findFirst({
    where: eq(messages.id, parentMessageId),
  });

  if (!parent) return { error: "Parent message not found" };
  if (parent.parentMessageId) return { error: "Cannot reply to a reply" };
  if (parent.channelId !== channelId) return { error: "Parent message not in this channel" };

  let reply: typeof messages.$inferSelect;
  try {
    reply = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(messages)
        .values({ channelId, userId, content, parentMessageId })
        .returning();

      if (!r) throw new Error("Failed to insert reply");

      if (attachmentIds.length > 0) {
        const linked = await linkAttachmentsToMessage(attachmentIds, r.id, userId, tx);
        if (linked !== attachmentIds.length) {
          throw new Error("ATTACHMENT_LINK_ERROR");
        }
      }

      return r;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ATTACHMENT_LINK_ERROR") {
      return { error: "One or more attachments are invalid or already linked" as const };
    }
    throw e;
  }

  // Store mentions outside the transaction (non-critical)
  await storeMentions(reply.id, channelId, userId, content);

  const [replyAttachments, sendersByUser, mentionsByMessage, botInfoByMessage] = await Promise.all([
    getAttachmentsForMessages([reply.id]),
    batchSenders([reply]),
    batchMentions([reply.id]),
    batchBotInfo([reply]),
  ]);

  const threadMeta = await batchThreadMeta([parentMessageId]);
  const meta = threadMeta.get(parentMessageId);

  return {
    reply: toMessage(reply, replyAttachments, undefined, [], sendersByUser.get(reply.userId), mentionsByMessage.get(reply.id) ?? [], botInfoByMessage.get(reply.id)),
    threadUpdate: {
      parentMessageId: asMessageId(parentMessageId),
      channelId: asChannelId(channelId),
      replyCount: meta?.replyCount ?? 1,
      latestReplyAt: meta?.latestReplyAt?.toISOString() ?? reply.createdAt.toISOString(),
    },
  };
}

export async function editMessage(
  messageId: MessageId,
  userId: UserId,
  content: string,
): Promise<Message | null> {
  const [updated] = await db
    .update(messages)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .returning();

  if (!updated) return null;

  // Re-process mentions: delete old, store new
  await deleteMentions(updated.id);
  await storeMentions(updated.id, asChannelId(updated.channelId), asUserId(updated.userId), content);

  const [hydrated] = await hydrateMessages([updated]);
  return hydrated!;
}

export async function deleteMessage(messageId: MessageId, userId: UserId): Promise<{ id: MessageId; channelId: ChannelId } | null> {
  // Verify ownership before doing anything
  const message = await db.query.messages.findFirst({
    where: and(eq(messages.id, messageId), eq(messages.userId, userId)),
  });

  if (!message) return null;

  // Delete S3 objects before deleting the message (DB rows cascade-delete)
  await deleteAttachmentsForMessage(messageId);

  await db.delete(messages).where(eq(messages.id, messageId));

  return { id: asMessageId(message.id), channelId: asChannelId(message.channelId) };
}

export async function createHuddleMessage(
  channelId: ChannelId,
  userId: UserId,
  metadata: HuddleMessageMetadata,
): Promise<Message> {
  const [msg] = await db
    .insert(messages)
    .values({ channelId, userId, content: "", type: "huddle", metadata })
    .returning();

  if (!msg) throw new Error("Failed to insert huddle message");

  const sendersByUser = await batchSenders([msg]);
  return toMessage(msg, [], undefined, [], sendersByUser.get(msg.userId));
}

export async function createChannelEventMessage(
  channelId: ChannelId,
  userId: UserId,
  metadata: ChannelEventMetadata,
): Promise<Message> {
  const [msg] = await db
    .insert(messages)
    .values({ channelId, userId, content: "", type: "channel_event", metadata })
    .returning();

  if (!msg) throw new Error("Failed to insert channel event message");

  const sendersByUser = await batchSenders([msg]);
  return toMessage(msg, [], undefined, [], sendersByUser.get(msg.userId));
}

export async function updateHuddleMessage(
  messageId: string,
  metadata: HuddleMessageMetadata,
): Promise<Message | null> {
  const [updated] = await db
    .update(messages)
    .set({ metadata, updatedAt: new Date() })
    .where(eq(messages.id, messageId))
    .returning();

  if (!updated) return null;

  const sendersByUser = await batchSenders([updated]);
  return toMessage(updated, [], undefined, [], sendersByUser.get(updated.userId));
}

export async function closeOrphanedHuddleMessages(): Promise<number> {
  const result = await db
    .update(messages)
    .set({
      metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{huddleEndedAt}', to_jsonb(now()::text))`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messages.type, "huddle"),
        sql`(metadata->>'huddleEndedAt') IS NULL`,
      ),
    )
    .returning({ id: messages.id });
  return result.length;
}

export async function getUserThreads(
  userId: UserId,
  workspaceId: string,
): Promise<Array<{ message: Message; channelName: string }>> {
  // Find all parent messages (with replies) where the user is involved:
  // either authored the parent, or has a reply in the thread.
  // Scoped to channels in the workspace where the user is a member.
  const rows = await db.execute<{
    parent_id: string;
    channel_name: string;
  }>(sql`
    SELECT DISTINCT p.id AS parent_id, ch.name AS channel_name
    FROM messages p
    INNER JOIN channels ch ON ch.id = p.channel_id
    INNER JOIN channel_members cm ON cm.channel_id = ch.id AND cm.user_id = ${userId}
    WHERE ch.workspace_id = ${workspaceId}
      AND p.parent_message_id IS NULL
      AND EXISTS (
        SELECT 1 FROM messages r WHERE r.parent_message_id = p.id
      )
      AND (
        p.user_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM messages r2
          WHERE r2.parent_message_id = p.id AND r2.user_id = ${userId}
        )
      )
    ORDER BY p.id
  `);

  if (rows.length === 0) return [];

  const parentIds = rows.map((r) => r.parent_id);
  const channelNameMap = new Map<string, string>();
  for (const r of rows) {
    channelNameMap.set(r.parent_id, r.channel_name);
  }

  const messageRows = await db.query.messages.findMany({
    where: inArray(messages.id, parentIds),
    orderBy: desc(messages.createdAt),
  });

  const hydrated = await hydrateMessages(messageRows);

  // Sort by latestReplyAt desc (most recent thread activity first)
  hydrated.sort((a, b) => {
    const aTime = a.latestReplyAt ? new Date(a.latestReplyAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.latestReplyAt ? new Date(b.latestReplyAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  return hydrated.map((msg) => ({
    message: msg,
    channelName: channelNameMap.get(msg.id) ?? "",
  }));
}

export async function createSharedMessage(
  destinationChannelId: ChannelId,
  userId: UserId,
  sharedMessageId: MessageId,
  comment: string,
): Promise<Message> {
  const [msg] = await db
    .insert(messages)
    .values({
      channelId: destinationChannelId,
      userId,
      content: comment,
      sharedMessageId,
    })
    .returning();

  if (!msg) throw new Error("Failed to insert shared message");

  const [sendersByUser, sharedMessagesByMessage] = await Promise.all([
    batchSenders([msg]),
    batchSharedMessages([msg]),
  ]);

  return toMessage(
    msg,
    [],
    undefined,
    [],
    sendersByUser.get(msg.userId),
    [],
    undefined,
    undefined,
    undefined,
    sharedMessagesByMessage.get(msg.id),
  );
}
