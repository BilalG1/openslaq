import { eq, and } from "drizzle-orm";
import type { Message, ChannelId, UserId } from "@openslaq/shared";
import { db } from "../db";
import { channelMembers, channels } from "../channels/schema";
import { channelReadPositions } from "../channels/read-positions-schema";
import { channelNotificationPrefs } from "../channels/notification-prefs-schema";
import { messageMentions } from "../messages/schema";
import { pushTokens, notificationPreferences } from "./schema";
import { getUnreadCounts } from "../channels/read-positions-service";
import { isApnsConfigured, sendApnsNotification } from "./apns";
import type { ApnsPayload } from "./apns";
import { schedulePush, cancelPushesForUser } from "./queue";
import { captureException } from "../sentry";

export async function scheduleMessagePush(
  message: Message,
  workspaceSlug: string,
): Promise<void> {
  if (!isApnsConfigured()) return;

  // Skip system messages (huddle messages, etc.)
  if (message.type) return;

  const senderId = message.userId;
  const channelId = message.channelId;
  const isThreadReply = !!message.parentMessageId;

  // Get channel members excluding sender
  const members = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId));

  // For thread replies, notify thread author + mentioned users only
  let recipientUserIds: string[];
  if (isThreadReply) {
    const mentionedUserIds = new Set(
      (message.mentions ?? [])
        .filter((m) => m.type === "user")
        .map((m) => m.userId),
    );

    // Get thread parent author
    const { messages: messagesTable } = await import("../messages/schema");
    const [parent] = await db
      .select({ userId: messagesTable.userId })
      .from(messagesTable)
      .where(eq(messagesTable.id, message.parentMessageId!))
      .limit(1);

    const threadRecipients = new Set<string>();
    if (parent) threadRecipients.add(parent.userId);
    for (const uid of mentionedUserIds) threadRecipients.add(uid);

    // Also include @here/@channel mentions for thread replies
    const hasGroupMention = (message.mentions ?? []).some(
      (m) => m.type === "here" || m.type === "channel",
    );
    if (hasGroupMention) {
      for (const m of members) threadRecipients.add(m.userId);
    }

    recipientUserIds = [...threadRecipients].filter((uid) => uid !== senderId);
  } else {
    recipientUserIds = members
      .map((m) => m.userId)
      .filter((uid) => uid !== senderId);
  }

  for (const userId of recipientUserIds) {
    schedulePush(message.id, userId, channelId, workspaceSlug).catch((err) =>
      captureException(err, { userId, channelId, op: "push:schedule" }),
    );
  }
}

export async function deliverPush(
  message: Message,
  userId: UserId,
  workspaceSlug: string,
): Promise<void> {
  // 1. Check read position — skip if user already read past this message
  const [readPos] = await db
    .select({ lastReadAt: channelReadPositions.lastReadAt })
    .from(channelReadPositions)
    .where(
      and(
        eq(channelReadPositions.userId, userId),
        eq(channelReadPositions.channelId, message.channelId),
      ),
    )
    .limit(1);

  if (readPos && readPos.lastReadAt >= new Date(message.createdAt)) {
    return;
  }

  // 2. Check per-channel notification preference
  const [channelPref] = await db
    .select({ level: channelNotificationPrefs.level })
    .from(channelNotificationPrefs)
    .where(
      and(
        eq(channelNotificationPrefs.userId, userId),
        eq(channelNotificationPrefs.channelId, message.channelId),
      ),
    )
    .limit(1);

  if (channelPref) {
    if (channelPref.level === "muted") return;
    if (channelPref.level === "mentions") {
      // Check if user is mentioned in this message
      const [mention] = await db
        .select({ userId: messageMentions.userId })
        .from(messageMentions)
        .where(
          and(
            eq(messageMentions.messageId, message.id),
            eq(messageMentions.userId, userId),
          ),
        )
        .limit(1);
      if (!mention) return;
    }
  }

  // 3. Check global notification preference
  const [globalPref] = await db
    .select({
      pushEnabled: notificationPreferences.pushEnabled,
      soundEnabled: notificationPreferences.soundEnabled,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (globalPref && !globalPref.pushEnabled) return;

  // 4. Get push tokens
  const tokens = await db
    .select({ id: pushTokens.id, token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));

  if (tokens.length === 0) return;

  // 5. Calculate badge count
  const unreadCounts = await getUnreadCounts(userId);
  const badge = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  // 6. Build notification payload
  const [channel] = await db
    .select({ name: channels.name, type: channels.type })
    .from(channels)
    .where(eq(channels.id, message.channelId))
    .limit(1);

  const senderName = message.senderDisplayName ?? "Someone";
  const isDm = channel?.type === "dm" || channel?.type === "group_dm";

  const title = isDm ? senderName : `#${channel?.name ?? "channel"}`;
  const subtitle = isDm ? undefined : senderName;

  // Truncate body to 200 chars for push notification
  const body =
    message.content.length > 200
      ? message.content.slice(0, 197) + "..."
      : message.content;

  const useSound = !globalPref || globalPref.soundEnabled;

  const payload: ApnsPayload = {
    aps: {
      alert: {
        title,
        ...(subtitle ? { subtitle } : {}),
        body,
      },
      badge,
      ...(useSound ? { sound: "default" } : {}),
      "thread-id": `channel:${message.channelId}`,
    },
    workspaceSlug,
    channelId: message.channelId,
    messageId: message.id,
    ...(message.parentMessageId
      ? { parentMessageId: message.parentMessageId }
      : {}),
  };

  // 7. Send to all registered tokens
  for (const { id, token } of tokens) {
    const result = await sendApnsNotification(token, payload);

    // Remove invalid tokens
    if (
      !result.success &&
      (result.reason === "BadDeviceToken" || result.reason === "Unregistered")
    ) {
      await db.delete(pushTokens).where(eq(pushTokens.id, id));
    }
  }
}

export function onReadPositionUpdated(userId: UserId, channelId: ChannelId): void {
  cancelPushesForUser(userId, channelId).catch((err) =>
    captureException(err, { userId, channelId, op: "push:cancel" }),
  );
}
