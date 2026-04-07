import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { channelMembers } from "../channels/schema";
import { channelNotificationPrefs } from "../channels/notification-prefs-schema";
import { notificationPreferences, voipPushTokens } from "../push/schema";
import { isVoipConfigured, sendVoipPushNotification } from "../push/apns";
import type { VoipPayload } from "../push/apns";
import { activeHuddles } from "./schema";

export async function sendHuddleRing(
  channelId: string,
  starterUserId: string,
  channelName: string,
  callerName: string,
  workspaceSlug: string,
): Promise<void> {
  if (!isVoipConfigured()) return;

  const callUuid = crypto.randomUUID();

  // Store callUuid on the active huddle row for later cancellation
  await db
    .update(activeHuddles)
    .set({ callUuid })
    .where(eq(activeHuddles.channelId, channelId));

  // Get channel members excluding the starter
  const members = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId));

  const recipientIds = members
    .map((m) => m.userId)
    .filter((uid) => uid !== starterUserId);

  if (recipientIds.length === 0) return;

  // Filter by notification preferences and send
  await Promise.allSettled(
    recipientIds.map((userId) =>
      sendRingToUser(userId, channelId, channelName, callerName, starterUserId, callUuid, workspaceSlug),
    ),
  );
}

async function sendRingToUser(
  userId: string,
  channelId: string,
  channelName: string,
  callerName: string,
  callerUserId: string,
  callUuid: string,
  workspaceSlug: string,
): Promise<void> {
  // Check per-channel notification preference — skip muted channels
  const [channelPref] = await db
    .select({ level: channelNotificationPrefs.level })
    .from(channelNotificationPrefs)
    .where(
      and(
        eq(channelNotificationPrefs.userId, userId),
        eq(channelNotificationPrefs.channelId, channelId),
      ),
    )
    .limit(1);

  if (channelPref?.level === "muted") return;

  // Check global notification preference
  const [globalPref] = await db
    .select({ pushEnabled: notificationPreferences.pushEnabled })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (globalPref && !globalPref.pushEnabled) return;

  // Get VoIP tokens
  const tokens = await db
    .select({ id: voipPushTokens.id, token: voipPushTokens.token })
    .from(voipPushTokens)
    .where(eq(voipPushTokens.userId, userId));

  if (tokens.length === 0) return;

  const payload: VoipPayload = {
    type: "huddle_ring",
    uuid: callUuid,
    channelId,
    channelName,
    callerName,
    callerUserId,
    workspaceSlug,
  };

  for (const { id, token } of tokens) {
    const result = await sendVoipPushNotification(token, payload);

    if (
      !result.success &&
      (result.reason === "BadDeviceToken" || result.reason === "Unregistered")
    ) {
      await db.delete(voipPushTokens).where(eq(voipPushTokens.id, id));
    }
  }
}

export async function cancelHuddleRing(
  channelId: string,
  callUuid?: string | null,
  excludeUserIds?: string[],
): Promise<void> {
  if (!isVoipConfigured()) return;

  // Use provided callUuid or look it up from the active huddle row
  let uuid = callUuid;
  if (!uuid) {
    const [huddle] = await db
      .select({ callUuid: activeHuddles.callUuid })
      .from(activeHuddles)
      .where(eq(activeHuddles.channelId, channelId))
      .limit(1);
    uuid = huddle?.callUuid;
  }

  if (!uuid) return;

  const excludeSet = new Set(excludeUserIds ?? []);

  // Get channel members' VoIP tokens (excluding huddle participants who were never rung)
  const members = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId));

  for (const { userId } of members) {
    if (excludeSet.has(userId)) continue;
    const tokens = await db
      .select({ id: voipPushTokens.id, token: voipPushTokens.token })
      .from(voipPushTokens)
      .where(eq(voipPushTokens.userId, userId));

    for (const { id, token } of tokens) {
      const payload: VoipPayload = {
        type: "huddle_cancel",
        uuid: uuid!,
        channelId,
        channelName: "",
        callerName: "",
        callerUserId: "",
        workspaceSlug: "",
      };

      const result = await sendVoipPushNotification(token, payload);

      if (
        !result.success &&
        (result.reason === "BadDeviceToken" || result.reason === "Unregistered")
      ) {
        await db.delete(voipPushTokens).where(eq(voipPushTokens.id, id));
      }
    }
  }

  // Clear callUuid if the row still exists (it may have been deleted if the huddle ended)
  if (!callUuid) {
    await db
      .update(activeHuddles)
      .set({ callUuid: null })
      .where(eq(activeHuddles.channelId, channelId));
  }
}
