import { eq, and, inArray, sql } from "drizzle-orm";
import type { HuddleState, ChannelId } from "@openslaq/shared";
import { asChannelId, asUserId } from "@openslaq/shared";
import { RoomManager } from "@openslaq/huddle/server";
import { db } from "../db";
import { activeHuddles, huddleParticipants } from "./schema";

export async function isUserInAnyHuddle(userId: string): Promise<{ inHuddle: boolean; channelId: string | null }> {
  const participation = await db.query.huddleParticipants.findFirst({
    where: eq(huddleParticipants.userId, userId),
  });
  return {
    inHuddle: !!participation,
    channelId: participation?.channelId ?? null,
  };
}

function toHuddleState(
  row: typeof activeHuddles.$inferSelect,
  participants: Array<typeof huddleParticipants.$inferSelect>,
): HuddleState {
  return {
    channelId: asChannelId(row.channelId),
    participants: participants.map((p) => ({
      userId: asUserId(p.userId),
      isMuted: p.isMuted,
      isCameraOn: p.isCameraOn,
      isScreenSharing: p.isScreenSharing,
      joinedAt: p.joinedAt.toISOString(),
    })),
    startedAt: row.startedAt.toISOString(),
    livekitRoom: row.livekitRoom,
    screenShareUserId: row.screenShareUserId ? asUserId(row.screenShareUserId) : null,
    messageId: row.messageId,
  };
}

export async function startHuddle(channelId: string, userId: string, livekitRoom?: string): Promise<HuddleState> {
  const existing = await db.query.activeHuddles.findFirst({
    where: eq(activeHuddles.channelId, channelId),
  });
  if (existing) {
    return joinHuddle(channelId, userId);
  }

  // User must leave any existing huddle first
  await leaveHuddle(userId);

  const now = new Date();
  const room = livekitRoom ?? RoomManager.roomNameForChannel(channelId);

  await db.insert(activeHuddles).values({
    channelId,
    startedAt: now,
    livekitRoom: room,
    participantHistory: [userId],
  });

  await db.insert(huddleParticipants).values({
    channelId,
    userId,
    joinedAt: now,
  });

  return {
    channelId: asChannelId(channelId),
    participants: [{
      userId: asUserId(userId),
      isMuted: false,
      isCameraOn: false,
      isScreenSharing: false,
      joinedAt: now.toISOString(),
    }],
    startedAt: now.toISOString(),
    livekitRoom: room,
    screenShareUserId: null,
    messageId: null,
  };
}

export async function joinHuddle(channelId: string, userId: string): Promise<HuddleState> {
  const huddle = await db.query.activeHuddles.findFirst({
    where: eq(activeHuddles.channelId, channelId),
  });
  if (!huddle) {
    return startHuddle(channelId, userId);
  }

  // Check if already in this huddle
  const existingParticipant = await db.query.huddleParticipants.findFirst({
    where: and(
      eq(huddleParticipants.channelId, channelId),
      eq(huddleParticipants.userId, userId),
    ),
  });

  if (existingParticipant) {
    const participants = await db.query.huddleParticipants.findMany({
      where: eq(huddleParticipants.channelId, channelId),
    });
    return toHuddleState(huddle, participants);
  }

  // Leave any existing huddle
  await leaveHuddle(userId);

  const now = new Date();
  await db.insert(huddleParticipants).values({
    channelId,
    userId,
    joinedAt: now,
  });

  // Add to participant history
  await db
    .update(activeHuddles)
    .set({
      participantHistory: sql`array_append(${activeHuddles.participantHistory}, ${userId})`,
    })
    .where(eq(activeHuddles.channelId, channelId));

  const participants = await db.query.huddleParticipants.findMany({
    where: eq(huddleParticipants.channelId, channelId),
  });

  // Re-fetch to get updated participantHistory
  const updatedHuddle = await db.query.activeHuddles.findFirst({
    where: eq(activeHuddles.channelId, channelId),
  });

  return toHuddleState(updatedHuddle ?? huddle, participants);
}

export interface LeaveResult {
  huddle: HuddleState | null;
  ended: boolean;
  channelId: ChannelId | null;
  messageId: string | null;
  startedAt: string | null;
  participantHistory: string[];
  callUuid: string | null;
}

export async function leaveHuddle(userId: string): Promise<LeaveResult> {
  // Find which huddle this user is in
  const participation = await db.query.huddleParticipants.findFirst({
    where: eq(huddleParticipants.userId, userId),
  });

  if (!participation) {
    return { huddle: null, ended: false, channelId: null, messageId: null, startedAt: null, participantHistory: [], callUuid: null };
  }

  const channelId = participation.channelId;

  // Remove the participant
  await db.delete(huddleParticipants).where(
    and(
      eq(huddleParticipants.channelId, channelId),
      eq(huddleParticipants.userId, userId),
    ),
  );

  // Clear screen share if the leaving user was sharing
  await db
    .update(activeHuddles)
    .set({ screenShareUserId: null })
    .where(
      and(
        eq(activeHuddles.channelId, channelId),
        eq(activeHuddles.screenShareUserId, userId),
      ),
    );

  // Check remaining participants
  const remaining = await db.query.huddleParticipants.findMany({
    where: eq(huddleParticipants.channelId, channelId),
  });

  if (remaining.length === 0) {
    // Huddle ended — read the huddle row before deleting
    const huddleRow = await db.query.activeHuddles.findFirst({
      where: eq(activeHuddles.channelId, channelId),
    });

    if (huddleRow) {
      await db.delete(activeHuddles).where(eq(activeHuddles.channelId, channelId));
      return {
        huddle: null,
        ended: true,
        channelId: asChannelId(channelId),
        messageId: huddleRow.messageId,
        startedAt: huddleRow.startedAt.toISOString(),
        participantHistory: huddleRow.participantHistory ?? [],
        callUuid: huddleRow.callUuid,
      };
    }

    return { huddle: null, ended: true, channelId: asChannelId(channelId), messageId: null, startedAt: null, participantHistory: [], callUuid: null };
  }

  const huddleRow = await db.query.activeHuddles.findFirst({
    where: eq(activeHuddles.channelId, channelId),
  });

  if (!huddleRow) {
    return { huddle: null, ended: false, channelId: asChannelId(channelId), messageId: null, startedAt: null, participantHistory: [], callUuid: null };
  }

  const huddle = toHuddleState(huddleRow, remaining);
  return {
    huddle,
    ended: false,
    channelId: asChannelId(channelId),
    messageId: huddleRow.messageId,
    startedAt: huddleRow.startedAt.toISOString(),
    participantHistory: [],
    callUuid: huddleRow.callUuid,
  };
}

export async function setHuddleMessageId(channelId: string, messageId: string): Promise<void> {
  await db
    .update(activeHuddles)
    .set({ messageId })
    .where(eq(activeHuddles.channelId, channelId));
}

export async function setMuted(userId: string, isMuted: boolean): Promise<HuddleState | null> {
  const participation = await db.query.huddleParticipants.findFirst({
    where: eq(huddleParticipants.userId, userId),
  });
  if (!participation) return null;

  await db
    .update(huddleParticipants)
    .set({ isMuted })
    .where(
      and(
        eq(huddleParticipants.channelId, participation.channelId),
        eq(huddleParticipants.userId, userId),
      ),
    );

  return getHuddleForChannel(participation.channelId);
}

export async function getHuddleForChannel(channelId: string): Promise<HuddleState | null> {
  const huddle = await db.query.activeHuddles.findFirst({
    where: eq(activeHuddles.channelId, channelId),
  });
  if (!huddle) return null;

  const participants = await db.query.huddleParticipants.findMany({
    where: eq(huddleParticipants.channelId, channelId),
  });

  return toHuddleState(huddle, participants);
}

export async function getUserHuddleChannel(userId: string): Promise<string | null> {
  const participation = await db.query.huddleParticipants.findFirst({
    where: eq(huddleParticipants.userId, userId),
  });
  return participation?.channelId ?? null;
}

export async function getActiveHuddlesForChannels(channelIds: string[]): Promise<HuddleState[]> {
  if (channelIds.length === 0) return [];

  const huddles = await db.query.activeHuddles.findMany({
    where: inArray(activeHuddles.channelId, channelIds),
  });

  if (huddles.length === 0) return [];

  const huddleChannelIds = huddles.map((h) => h.channelId);
  const allParticipants = await db.query.huddleParticipants.findMany({
    where: inArray(huddleParticipants.channelId, huddleChannelIds),
  });

  const participantsByChannel = new Map<string, Array<typeof huddleParticipants.$inferSelect>>();
  for (const p of allParticipants) {
    const list = participantsByChannel.get(p.channelId) ?? [];
    list.push(p);
    participantsByChannel.set(p.channelId, list);
  }

  return huddles.map((h) => toHuddleState(h, participantsByChannel.get(h.channelId) ?? []));
}

export async function removeUserFromAllHuddles(userId: string): Promise<LeaveResult> {
  return leaveHuddle(userId);
}

/** Reset all state — for testing only */
export async function _resetForTests(): Promise<void> {
  await db.delete(huddleParticipants);
  await db.delete(activeHuddles);
}
