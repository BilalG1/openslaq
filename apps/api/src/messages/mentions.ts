import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { messageMentions } from "./schema";
import { users } from "../users/schema";
import { listChannelMembers } from "../channels/service";
import { getOnlineUserIds } from "../presence/service";
import type { ChannelId, UserId, Mention } from "@openslaq/shared";
import { asUserId } from "@openslaq/shared";

interface ParsedMention {
  userId: string;
  type: "user" | "here" | "channel";
}

const MENTION_REGEX = /<@([^>]+)>/g;

export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(MENTION_REGEX)) {
    const token = match[1]!;
    if (seen.has(token)) continue;
    seen.add(token);

    if (token === "here") {
      mentions.push({ userId: "here", type: "here" });
    } else if (token === "channel") {
      mentions.push({ userId: "channel", type: "channel" });
    } else {
      mentions.push({ userId: token, type: "user" });
    }
  }

  return mentions;
}

export async function expandGroupMentions(
  parsed: ParsedMention[],
  channelId: ChannelId,
  senderId: UserId,
): Promise<{ userId: string; type: "user" | "here" | "channel" }[]> {
  const result: { userId: string; type: "user" | "here" | "channel" }[] = [];

  // Direct user mentions
  for (const m of parsed) {
    if (m.type === "user") {
      result.push({ userId: m.userId, type: "user" });
    }
  }

  const hasHere = parsed.some((m) => m.type === "here");
  const hasChannel = parsed.some((m) => m.type === "channel");

  if (hasHere || hasChannel) {
    const members = await listChannelMembers(channelId);
    const memberIds = members.map((m) => m.id);

    if (hasChannel) {
      for (const id of memberIds) {
        if (id === senderId) continue;
        if (!result.some((r) => r.userId === id)) {
          result.push({ userId: id, type: "channel" });
        }
      }
    }

    if (hasHere) {
      const onlineIds = await getOnlineUserIds();
      for (const id of memberIds) {
        if (id === senderId) continue;
        if (!onlineIds.has(id)) continue;
        if (!result.some((r) => r.userId === id)) {
          result.push({ userId: id, type: "here" });
        }
      }
    }
  }

  return result;
}

export async function storeMentions(
  messageId: string,
  channelId: ChannelId,
  senderId: UserId,
  content: string,
): Promise<void> {
  const parsed = parseMentions(content);
  if (parsed.length === 0) return;

  const expanded = await expandGroupMentions(parsed, channelId, senderId);
  if (expanded.length === 0) return;

  // Filter to only existing users
  const userIds = [...new Set(expanded.map((m) => m.userId))];
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, userIds));
  const existingUserIds = new Set(existingUsers.map((u) => u.id));

  const validMentions = expanded.filter((m) => existingUserIds.has(m.userId));
  if (validMentions.length === 0) return;

  // Deduplicate by userId (keep first type encountered)
  const seen = new Map<string, (typeof validMentions)[number]>();
  for (const m of validMentions) {
    if (!seen.has(m.userId)) {
      seen.set(m.userId, m);
    }
  }

  await db.insert(messageMentions).values(
    [...seen.values()].map((m) => ({
      messageId,
      userId: m.userId,
      type: m.type,
    })),
  );
}

export async function deleteMentions(messageId: string): Promise<void> {
  await db.delete(messageMentions).where(eq(messageMentions.messageId, messageId));
}

export async function batchMentions(
  messageIds: string[],
): Promise<Map<string, Mention[]>> {
  if (messageIds.length === 0) return new Map();

  const mentionRows = await db
    .select({
      messageId: messageMentions.messageId,
      userId: messageMentions.userId,
      type: messageMentions.type,
    })
    .from(messageMentions)
    .where(inArray(messageMentions.messageId, messageIds));

  if (mentionRows.length === 0) return new Map();

  // Fetch display names for mentioned users
  const uniqueUserIds = [...new Set(mentionRows.map((r) => r.userId))];
  const userRows = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(inArray(users.id, uniqueUserIds));
  const userMap = new Map(userRows.map((u) => [u.id, u.displayName]));

  const map = new Map<string, Mention[]>();
  for (const row of mentionRows) {
    const list = map.get(row.messageId) ?? [];
    list.push({
      userId: asUserId(row.userId),
      displayName: userMap.get(row.userId) ?? row.userId,
      type: row.type as Mention["type"],
    });
    map.set(row.messageId, list);
  }

  return map;
}
