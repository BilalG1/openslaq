import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { updateUser } from "../users/service";
import { addChannelMember, isChannelMember, getChannelById } from "../channels/service";
import { setChannelNotificationPref } from "../channels/notification-prefs-service";
import { getIO } from "../socket/io";
import { db } from "../db";
import { workspaceMembers } from "../workspaces/schema";
import { reminders } from "./reminder-schema";
import { parseRemindTime } from "./time-parser";
import type { EphemeralMessage } from "@openslaq/shared";
import { asChannelId, asUserId } from "@openslaq/shared";

function safeEmit(fn: (io: ReturnType<typeof getIO>) => void) {
  try {
    fn(getIO());
  } catch {
    // Socket.IO may not be initialized in all contexts
  }
}

function makeEphemeral(channelId: string, text: string): EphemeralMessage {
  return {
    id: randomUUID(),
    channelId: asChannelId(channelId),
    text,
    senderName: "Slaqbot",
    senderAvatarUrl: null,
    createdAt: new Date().toISOString(),
    ephemeral: true,
  };
}

export async function handleStatus(
  args: string,
  userId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  if (!args.trim()) {
    return [makeEphemeral(channelId, "Usage: `/status :emoji: [status text]`\nUse `/status clear` to clear your status.")];
  }

  if (args.trim().toLowerCase() === "clear") {
    await updateUser(userId, {
      statusEmoji: null,
      statusText: null,
      statusExpiresAt: null,
    });

    safeEmit((io) =>
      io.emit("user:statusUpdated", {
        userId: asUserId(userId),
        statusEmoji: null,
        statusText: null,
        statusExpiresAt: null,
      }),
    );

    return [makeEphemeral(channelId, "Status cleared.")];
  }

  // Parse :emoji: text
  const emojiMatch = args.match(/^(:[\w+-]+:)\s*(.*)/);
  const emoji = emojiMatch ? emojiMatch[1]! : null;
  const text = emojiMatch ? emojiMatch[2]!.trim() : args.trim();

  await updateUser(userId, {
    statusEmoji: emoji,
    statusText: text || null,
    statusExpiresAt: null,
  });

  safeEmit((io) =>
    io.emit("user:statusUpdated", {
      userId: asUserId(userId),
      statusEmoji: emoji,
      statusText: text || null,
      statusExpiresAt: null,
    }),
  );

  const display = emoji ? `${emoji} ${text}` : text;
  return [makeEphemeral(channelId, `Status set to: ${display}`)];
}

export async function handleRemind(
  args: string,
  userId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  if (!args.trim()) {
    return [makeEphemeral(channelId, "Usage: `/remind [what] [when]`\nExamples: `/remind standup in 30 minutes`, `/remind check email tomorrow`")];
  }

  // Try to find a time expression at the end of the args
  // Pattern: "text <time expression>"
  const timePatterns = [
    /\b(in\s+\d+\s+(?:minutes?|mins?|hours?|hrs?|days?))\s*$/i,
    /\b(tomorrow(?:\s+at\s+\d{1,2}:\d{2})?)\s*$/i,
    /\b(at\s+\d{1,2}:\d{2})\s*$/i,
    /\b(next\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))\s*$/i,
  ];

  let reminderText = args.trim();
  let timeExpr: string | null = null;

  for (const pattern of timePatterns) {
    const match = reminderText.match(pattern);
    if (match) {
      timeExpr = match[1]!;
      reminderText = reminderText.slice(0, match.index!).trim();
      break;
    }
  }

  if (!timeExpr) {
    return [makeEphemeral(channelId, "I couldn't understand the time. Try: `in 30 minutes`, `tomorrow`, `at 14:00`, `next monday`")];
  }

  const remindAt = parseRemindTime(timeExpr);
  if (!remindAt) {
    return [makeEphemeral(channelId, `I couldn't parse "${timeExpr}". Try: \`in 30 minutes\`, \`tomorrow\`, \`at 14:00\`, \`next monday\``)];
  }

  if (!reminderText) {
    reminderText = "Reminder";
  }

  await db.insert(reminders).values({
    userId,
    channelId,
    text: reminderText,
    remindAt,
  });

  const timeStr = remindAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return [makeEphemeral(channelId, `I'll remind you "${reminderText}" on ${timeStr}.`)];
}

export async function handleInvite(
  args: string,
  userId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  if (!args.trim()) {
    return [makeEphemeral(channelId, "Usage: `/invite @user`")];
  }

  // Parse <@userId> or @userId pattern (TipTap mention format)
  const mentionMatch = args.match(/<@([^>]+)>/) || args.match(/@(\S+)/);
  if (!mentionMatch) {
    return [makeEphemeral(channelId, "Usage: `/invite @user`")];
  }

  const targetUserId = mentionMatch[1]!;

  // Verify the target user is a workspace member
  const channel = await getChannelById(asChannelId(channelId));
  if (channel) {
    const wsMembership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, channel.workspaceId),
        eq(workspaceMembers.userId, targetUserId),
      ),
    });
    if (!wsMembership) {
      return [makeEphemeral(channelId, "That user is not a member of this workspace.")];
    }
  }

  // Check if already a member
  const alreadyMember = await isChannelMember(asChannelId(channelId), asUserId(targetUserId));
  if (alreadyMember) {
    return [makeEphemeral(channelId, "That user is already a member of this channel.")];
  }

  await addChannelMember(asChannelId(channelId), asUserId(targetUserId));

  safeEmit((io) =>
    io.to(`channel:${channelId}`).emit("channel:member-added", {
      channelId: asChannelId(channelId),
      userId: asUserId(targetUserId),
    }),
  );

  return [makeEphemeral(channelId, `Invited <@${targetUserId}> to this channel.`)];
}

export async function handleMute(
  _args: string,
  userId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  await setChannelNotificationPref(asUserId(userId), asChannelId(channelId), "muted");
  return [makeEphemeral(channelId, "This channel has been muted. You'll only see a badge for mentions.")];
}

export async function handleUnmute(
  _args: string,
  userId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  await setChannelNotificationPref(asUserId(userId), asChannelId(channelId), "all");
  return [makeEphemeral(channelId, "This channel has been unmuted.")];
}
