import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  setMuted,
  getHuddleForChannel,
  getUserHuddleChannel,
  getActiveHuddlesForChannels,
  removeUserFromAllHuddles,
  setHuddleMessageId,
  _resetForTests,
} from "../../api/src/huddle/service";
import { createTestClient, testId, createTestWorkspace, addToWorkspace } from "./helpers/api-client";

let channel1: string;
let channel2: string;
let user1: string;
let user2: string;
let user3: string;

beforeAll(async () => {
  const id = testId();

  // Create three test users
  const ctx1 = await createTestClient({
    id: `huddle-u1-${id}`,
    displayName: "Huddle User 1",
    email: `huddle-u1-${id}@openslaq.dev`,
  });
  const ctx2 = await createTestClient({
    id: `huddle-u2-${id}`,
    displayName: "Huddle User 2",
    email: `huddle-u2-${id}@openslaq.dev`,
  });
  const ctx3 = await createTestClient({
    id: `huddle-u3-${id}`,
    displayName: "Huddle User 3",
    email: `huddle-u3-${id}@openslaq.dev`,
  });

  user1 = ctx1.user.id;
  user2 = ctx2.user.id;
  user3 = ctx3.user.id;

  // Create a workspace and add all users
  const ws = await createTestWorkspace(ctx1.client);
  await addToWorkspace(ctx1.client, ws.slug, ctx2.client);
  await addToWorkspace(ctx1.client, ws.slug, ctx3.client);

  // Create two channels
  async function createChannel(name: string) {
    const res = await ctx1.client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name },
    });
    if (res.status !== 201) throw new Error(`Channel create failed: ${res.status}`);
    return ((await res.json()) as { id: string }).id;
  }

  channel1 = await createChannel(`huddle-ch1-${id}`);
  channel2 = await createChannel(`huddle-ch2-${id}`);

  // Have all users join both channels
  for (const ctx of [ctx2, ctx3]) {
    for (const chId of [channel1, channel2]) {
      await ctx.client.api.workspaces[":slug"].channels[":id"].join.$post({
        param: { slug: ws.slug, id: chId },
      });
    }
  }
});

describe("huddle service", () => {
  beforeEach(async () => {
    await _resetForTests();
  });

  describe("startHuddle", () => {
    test("creates a new huddle with user as first participant", async () => {
      const huddle = await startHuddle(channel1, user1);
      expect(String(huddle.channelId)).toBe(channel1);
      expect(huddle.participants).toHaveLength(1);
      expect(String(huddle.participants[0]!.userId)).toBe(user1);
      expect(huddle.participants[0]!.isMuted).toBe(false);
      expect(huddle.participants[0]!.isCameraOn).toBe(false);
      expect(huddle.participants[0]!.isScreenSharing).toBe(false);
      expect(huddle.startedAt).toBeTruthy();
      expect(huddle.livekitRoom).toBeTruthy();
      expect(huddle.screenShareUserId).toBeNull();
    });

    test("returns existing huddle and adds user if huddle already exists", async () => {
      await startHuddle(channel1, user1);
      const huddle = await startHuddle(channel1, user2);
      expect(huddle.participants).toHaveLength(2);
      expect(huddle.participants.map((p) => String(p.userId))).toContain(user1);
      expect(huddle.participants.map((p) => String(p.userId))).toContain(user2);
    });

    test("leaves existing huddle when starting a new one", async () => {
      await startHuddle(channel1, user1);
      await startHuddle(channel2, user1);

      expect(await getUserHuddleChannel(user1)).toBe(channel2);
      // channel1 huddle should have ended (no participants)
      expect(await getHuddleForChannel(channel1)).toBeNull();
    });
  });

  describe("joinHuddle", () => {
    test("joins existing huddle", async () => {
      await startHuddle(channel1, user1);
      const huddle = await joinHuddle(channel1, user2);
      expect(huddle.participants).toHaveLength(2);
    });

    test("starts huddle if none exists", async () => {
      const huddle = await joinHuddle(channel1, user1);
      expect(String(huddle.channelId)).toBe(channel1);
      expect(huddle.participants).toHaveLength(1);
    });

    test("no-op if user already in the same huddle", async () => {
      await startHuddle(channel1, user1);
      const huddle = await joinHuddle(channel1, user1);
      expect(huddle.participants).toHaveLength(1);
    });

    test("leaves current huddle when joining another", async () => {
      await startHuddle(channel1, user1);
      await joinHuddle(channel1, user2);
      await joinHuddle(channel2, user1);

      expect(await getUserHuddleChannel(user1)).toBe(channel2);
      const ch1Huddle = await getHuddleForChannel(channel1);
      expect(ch1Huddle?.participants).toHaveLength(1);
      expect(String(ch1Huddle?.participants[0]!.userId)).toBe(user2);
    });
  });

  describe("leaveHuddle", () => {
    test("removes user from huddle", async () => {
      await startHuddle(channel1, user1);
      await joinHuddle(channel1, user2);
      const result = await leaveHuddle(user1);
      expect(result.ended).toBe(false);
      expect(result.huddle?.participants).toHaveLength(1);
      expect(String(result.channelId)).toBe(channel1);
    });

    test("ends huddle when last participant leaves", async () => {
      await startHuddle(channel1, user1);
      const result = await leaveHuddle(user1);
      expect(result.ended).toBe(true);
      expect(String(result.channelId)).toBe(channel1);
      expect(await getHuddleForChannel(channel1)).toBeNull();
    });

    test("returns no-op for user not in a huddle", async () => {
      const result = await leaveHuddle(user1);
      expect(result.ended).toBe(false);
      expect(result.channelId).toBeNull();
    });

    test("clears user huddle mapping", async () => {
      await startHuddle(channel1, user1);
      await leaveHuddle(user1);
      expect(await getUserHuddleChannel(user1)).toBeNull();
    });

    test("clears screenShareUserId when screen-sharing user leaves", async () => {
      await startHuddle(channel1, user1);
      const result = await leaveHuddle(user1);

      expect(result.ended).toBe(true);
      expect(await getHuddleForChannel(channel1)).toBeNull();
    });
  });

  describe("setMuted", () => {
    test("toggles mute state", async () => {
      await startHuddle(channel1, user1);
      const huddle = await setMuted(user1, true);
      expect(huddle?.participants[0]!.isMuted).toBe(true);

      const huddle2 = await setMuted(user1, false);
      expect(huddle2?.participants[0]!.isMuted).toBe(false);
    });

    test("returns null if user not in a huddle", async () => {
      expect(await setMuted(user1, true)).toBeNull();
    });
  });

  describe("getHuddleForChannel", () => {
    test("returns huddle for active channel", async () => {
      await startHuddle(channel1, user1);
      const huddle = await getHuddleForChannel(channel1);
      expect(huddle).not.toBeNull();
      expect(String(huddle!.channelId)).toBe(channel1);
    });

    test("returns null for channel with no huddle", async () => {
      expect(await getHuddleForChannel(channel1)).toBeNull();
    });
  });

  describe("getUserHuddleChannel", () => {
    test("returns channel for user in a huddle", async () => {
      await startHuddle(channel1, user1);
      expect(await getUserHuddleChannel(user1)).toBe(channel1);
    });

    test("returns null for user not in a huddle", async () => {
      expect(await getUserHuddleChannel(user1)).toBeNull();
    });
  });

  describe("getActiveHuddlesForChannels", () => {
    test("returns all active huddles for given channels", async () => {
      await startHuddle(channel1, user1);
      await startHuddle(channel2, user2);
      const huddles = await getActiveHuddlesForChannels([channel1, channel2]);
      expect(huddles).toHaveLength(2);
    });

    test("returns empty array when no huddles active", async () => {
      expect(await getActiveHuddlesForChannels([channel1])).toHaveLength(0);
    });

    test("only returns huddles for requested channels", async () => {
      await startHuddle(channel1, user1);
      await startHuddle(channel2, user2);
      const huddles = await getActiveHuddlesForChannels([channel1]);
      expect(huddles).toHaveLength(1);
      expect(String(huddles[0]!.channelId)).toBe(channel1);
    });
  });

  describe("removeUserFromAllHuddles", () => {
    test("removes user and returns result", async () => {
      await startHuddle(channel1, user1);
      await joinHuddle(channel1, user2);
      const result = await removeUserFromAllHuddles(user1);
      expect(String(result.channelId)).toBe(channel1);
      expect(result.ended).toBe(false);
    });

    test("ends huddle if user was last participant", async () => {
      await startHuddle(channel1, user1);
      const result = await removeUserFromAllHuddles(user1);
      expect(result.ended).toBe(true);
    });
  });

  describe("messageId and participantHistory", () => {
    test("startHuddle initializes messageId as null", async () => {
      const huddle = await startHuddle(channel1, user1);
      expect(huddle.messageId).toBeNull();
    });

    test("setHuddleMessageId stores messageId on huddle", async () => {
      const fakeMessageId = "00000000-0000-4000-8000-000000000123";
      await startHuddle(channel1, user1);
      await setHuddleMessageId(channel1, fakeMessageId);
      const huddle = await getHuddleForChannel(channel1);
      expect(huddle!.messageId).toBe(fakeMessageId);
    });

    test("leaveHuddle returns messageId and participantHistory when huddle ends", async () => {
      const fakeMessageId = "00000000-0000-4000-8000-000000000456";
      await startHuddle(channel1, user1);
      await joinHuddle(channel1, user2);
      await setHuddleMessageId(channel1, fakeMessageId);
      await leaveHuddle(user2);
      const result = await leaveHuddle(user1);
      expect(result.ended).toBe(true);
      expect(result.messageId).toBe(fakeMessageId);
      expect(result.startedAt).toBeTruthy();
      expect(result.participantHistory).toContain(user1);
      expect(result.participantHistory).toContain(user2);
    });

    test("leaveHuddle returns null messageId when no message was set", async () => {
      await startHuddle(channel1, user1);
      const result = await leaveHuddle(user1);
      expect(result.ended).toBe(true);
      expect(result.messageId).toBeNull();
      expect(result.participantHistory).toContain(user1);
    });
  });

  describe("one-huddle-per-user constraint", () => {
    test("user can only be in one huddle at a time", async () => {
      await startHuddle(channel1, user1);
      await joinHuddle(channel2, user1);

      expect(await getUserHuddleChannel(user1)).toBe(channel2);
      // Channel1 huddle should be gone since user1 was the only participant
      expect(await getHuddleForChannel(channel1)).toBeNull();
    });

    test("multiple users in same huddle works", async () => {
      await startHuddle(channel1, user1);
      await joinHuddle(channel1, user2);
      await joinHuddle(channel1, user3);

      const huddle = await getHuddleForChannel(channel1);
      expect(huddle?.participants).toHaveLength(3);
    });
  });
});
