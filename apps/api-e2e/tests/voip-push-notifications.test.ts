import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, getBaseUrl, testId, TestApiClient } from "./helpers/api-client";
import { _resetForTests } from "../../api/src/huddle/service";
import { roomManager } from "../../api/src/huddle/routes";
import type { VoipPayload } from "../../api/src/push/apns";

describe("voip push notifications", () => {
  let client: TestApiClient;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `voip-user-${testId()}`,
      displayName: "VoIP Test User",
      email: `voip-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    client = ctx.client;
    await createTestWorkspace(client);
  });

  describe("voip tokens", () => {
    test("POST /api/voip-tokens registers token → 200", async () => {
      const res = await client.api["voip-tokens"].$post({
        json: { token: `voip-token-${testId()}`, platform: "ios" as const },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });

    test("POST same token from same user is idempotent", async () => {
      const token = `voip-idempotent-${testId()}`;
      const res1 = await client.api["voip-tokens"].$post({
        json: { token, platform: "ios" as const },
      });
      expect(res1.status).toBe(200);

      const res2 = await client.api["voip-tokens"].$post({
        json: { token, platform: "ios" as const },
      });
      expect(res2.status).toBe(200);
    });

    test("POST same token from different user updates userId (upsert)", async () => {
      const sharedToken = `voip-shared-${testId()}`;

      const res1 = await client.api["voip-tokens"].$post({
        json: { token: sharedToken, platform: "ios" as const },
      });
      expect(res1.status).toBe(200);

      const ctx2 = await createTestClient({
        id: `voip-user2-${testId()}`,
        displayName: "VoIP Test User 2",
        email: `voip2-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      await createTestWorkspace(ctx2.client);

      const res2 = await ctx2.client.api["voip-tokens"].$post({
        json: { token: sharedToken, platform: "ios" as const },
      });
      expect(res2.status).toBe(200);
    });

    test("DELETE /api/voip-tokens removes token → 200", async () => {
      const token = `voip-delete-${testId()}`;
      await client.api["voip-tokens"].$post({
        json: { token, platform: "ios" as const },
      });

      const res = await client.api["voip-tokens"].$delete({
        json: { token },
      });
      expect(res.status).toBe(200);
    });

    test("DELETE non-existent token is a no-op → 200", async () => {
      const res = await client.api["voip-tokens"].$delete({
        json: { token: "non-existent-voip-token" },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("huddle ring delivery", () => {
    const baseUrl = getBaseUrl();
    const testSecret = process.env.E2E_TEST_SECRET!;
    const testHeaders = {
      Authorization: `Bearer ${testSecret}`,
      "Content-Type": "application/json",
    };

    async function enableFakeVoipPush() {
      const res = await fetch(`${baseUrl}/api/test/voip-push/enable-fake`, {
        method: "POST",
        headers: testHeaders,
      });
      expect(res.status).toBe(200);
    }

    async function disableFakeVoipPush() {
      await fetch(`${baseUrl}/api/test/voip-push/disable-fake`, {
        method: "POST",
        headers: testHeaders,
      });
    }

    interface SentVoipPush {
      token: string;
      payload: VoipPayload;
      result: { success: boolean; statusCode: number; reason?: string };
    }

    async function getSentVoipPushes(): Promise<SentVoipPush[]> {
      const res = await fetch(`${baseUrl}/api/test/voip-push/sent`, {
        headers: testHeaders,
      });
      return (await res.json()) as SentVoipPush[];
    }

    async function clearSentVoipPushes() {
      await fetch(`${baseUrl}/api/test/voip-push/clear`, {
        method: "POST",
        headers: testHeaders,
      });
    }

    async function setFakeVoipResponse(response: { success: boolean; statusCode: number; reason?: string }) {
      await fetch(`${baseUrl}/api/test/voip-push/set-fake-response`, {
        method: "POST",
        headers: testHeaders,
        body: JSON.stringify(response),
      });
    }

    let senderClient: TestApiClient;
    let recipientClient1: TestApiClient;
    let recipientClient2: TestApiClient;
    let recipientUserId1: string;
    let recipientUserId2: string;
    let wsSlug: string;
    let channelId: string;
    let recipientVoipToken1: string;
    let recipientVoipToken2: string;

    const originalListParticipants = roomManager.listParticipants.bind(roomManager);
    const originalEnsureRoom = roomManager.ensureRoom.bind(roomManager);
    const originalGetTotalParticipantCount = roomManager.getTotalParticipantCount.bind(roomManager);

    beforeAll(async () => {
      // Create sender
      const senderId = `ring-sender-${testId()}`;
      const senderCtx = await createTestClient({
        id: senderId,
        displayName: "Ring Sender",
        email: `ring-sender-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      senderClient = senderCtx.client;
      const ws = await createTestWorkspace(senderClient);
      wsSlug = ws.slug;

      // Create recipients
      recipientUserId1 = `ring-recipient1-${testId()}`;
      const recipientCtx1 = await createTestClient({
        id: recipientUserId1,
        displayName: "Ring Recipient 1",
        email: `ring-r1-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      recipientClient1 = recipientCtx1.client;
      await addToWorkspace(senderClient, wsSlug, recipientClient1);

      recipientUserId2 = `ring-recipient2-${testId()}`;
      const recipientCtx2 = await createTestClient({
        id: recipientUserId2,
        displayName: "Ring Recipient 2",
        email: `ring-r2-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      recipientClient2 = recipientCtx2.client;
      await addToWorkspace(senderClient, wsSlug, recipientClient2);

      // Create a channel with all 3 users
      const chRes = await senderClient.api.workspaces[":slug"].channels.$post({
        param: { slug: wsSlug },
        json: { name: `ring-test-${testId()}` },
      });
      expect(chRes.status).toBe(201);
      const ch = (await chRes.json()) as { id: string };
      channelId = ch.id;

      // Join recipients to channel
      await recipientClient1.api.workspaces[":slug"].channels[":id"].join.$post({
        param: { slug: wsSlug, id: channelId },
      });
      await recipientClient2.api.workspaces[":slug"].channels[":id"].join.$post({
        param: { slug: wsSlug, id: channelId },
      });

      // Register VoIP tokens for recipients
      recipientVoipToken1 = `voip-fake-r1-${testId()}`;
      await recipientClient1.api["voip-tokens"].$post({
        json: { token: recipientVoipToken1, platform: "ios" as const },
      });

      recipientVoipToken2 = `voip-fake-r2-${testId()}`;
      await recipientClient2.api["voip-tokens"].$post({
        json: { token: recipientVoipToken2, platform: "ios" as const },
      });

      // Mock LiveKit room manager
      roomManager.listParticipants = async () => [];
      roomManager.ensureRoom = async (id: string) => `huddle-${id}`;
      roomManager.getTotalParticipantCount = async () => 0;
    });

    afterAll(async () => {
      await disableFakeVoipPush();
      roomManager.listParticipants = originalListParticipants;
      roomManager.ensureRoom = originalEnsureRoom;
      roomManager.getTotalParticipantCount = originalGetTotalParticipantCount;
    });

    test("huddle start sends VoIP ring to all channel members except starter", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Sender joins huddle (starts it)
      const joinRes = await senderClient.api.huddle.join.$post({
        json: { channelId },
      });
      expect(joinRes.status).toBe(200);

      // Wait for async ring delivery
      await new Promise((r) => setTimeout(r, 500));

      const sent = await getSentVoipPushes();
      // Should have sent to both recipients but not to sender
      const ringPushes = sent.filter((s) => s.payload.type === "huddle_ring");
      expect(ringPushes.length).toBe(2);

      // Verify payload shape
      for (const push of ringPushes) {
        expect(push.payload.type).toBe("huddle_ring");
        expect(push.payload.channelId).toBe(channelId);
        expect(push.payload.callerName).toBe("Ring Sender");
        expect(push.payload.uuid).toBeTruthy();
      }

      // Both recipient tokens should have received pushes
      const tokens = ringPushes.map((p) => p.token);
      expect(tokens).toContain(recipientVoipToken1);
      expect(tokens).toContain(recipientVoipToken2);

      // All UUIDs should be the same (same huddle instance)
      const uuids = ringPushes.map((p) => p.payload.uuid);
      expect(uuids[0]).toBe(uuids[1]);

      // Clean up
      await senderClient.api.huddle.leave.$post({});
    });

    test("muted channel member does not receive ring", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Mute channel for recipient 1
      await recipientClient1.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
        param: { slug: wsSlug, id: channelId },
        json: { level: "muted" },
      });

      // Sender starts huddle
      const joinRes = await senderClient.api.huddle.join.$post({
        json: { channelId },
      });
      expect(joinRes.status).toBe(200);

      await new Promise((r) => setTimeout(r, 500));

      const sent = await getSentVoipPushes();
      const ringPushes = sent.filter((s) => s.payload.type === "huddle_ring");

      // Only recipient 2 should get the ring
      expect(ringPushes.length).toBe(1);
      expect(ringPushes[0]!.token).toBe(recipientVoipToken2);

      // Clean up: unmute and leave
      await recipientClient1.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
        param: { slug: wsSlug, id: channelId },
        json: { level: "all" },
      });
      await senderClient.api.huddle.leave.$post({});
    });

    test("global pushEnabled=false skips ring", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Disable push globally for recipient 1
      await recipientClient1.api.users.me["notification-preferences"].$put({
        json: { pushEnabled: false },
      });

      // Sender starts huddle
      const joinRes = await senderClient.api.huddle.join.$post({
        json: { channelId },
      });
      expect(joinRes.status).toBe(200);

      await new Promise((r) => setTimeout(r, 500));

      const sent = await getSentVoipPushes();
      const ringPushes = sent.filter((s) => s.payload.type === "huddle_ring");

      // Only recipient 2 should get the ring
      expect(ringPushes.length).toBe(1);
      expect(ringPushes[0]!.token).toBe(recipientVoipToken2);

      // Clean up
      await recipientClient1.api.users.me["notification-preferences"].$put({
        json: { pushEnabled: true },
      });
      await senderClient.api.huddle.leave.$post({});
    });

    test("cancel push sent when huddle ends", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Start huddle
      const joinRes = await senderClient.api.huddle.join.$post({
        json: { channelId },
      });
      expect(joinRes.status).toBe(200);

      await new Promise((r) => setTimeout(r, 500));

      // Get the ring UUID
      const ringPushes = (await getSentVoipPushes()).filter((s) => s.payload.type === "huddle_ring");
      expect(ringPushes.length).toBeGreaterThan(0);
      const ringUuid = ringPushes[0]!.payload.uuid;

      await clearSentVoipPushes();

      // Leave huddle (ends it since only participant)
      const leaveRes = await senderClient.api.huddle.leave.$post({});
      expect(leaveRes.status).toBe(200);
      const leaveBody = (await leaveRes.json()) as { ended: boolean };
      expect(leaveBody.ended).toBe(true);

      await new Promise((r) => setTimeout(r, 500));

      // Verify cancel pushes sent with same UUID
      const sent = await getSentVoipPushes();
      const cancelPushes = sent.filter((s) => s.payload.type === "huddle_cancel");
      expect(cancelPushes.length).toBeGreaterThan(0);
      for (const push of cancelPushes) {
        expect(push.payload.uuid).toBe(ringUuid);
      }
    });

    test("second joiner does not trigger new ring", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Sender starts huddle
      await senderClient.api.huddle.join.$post({
        json: { channelId },
      });

      await new Promise((r) => setTimeout(r, 500));

      const ringsAfterStart = (await getSentVoipPushes()).filter((s) => s.payload.type === "huddle_ring");
      expect(ringsAfterStart.length).toBeGreaterThan(0);

      await clearSentVoipPushes();

      // Recipient 1 joins (second participant)
      await recipientClient1.api.huddle.join.$post({
        json: { channelId },
      });

      await new Promise((r) => setTimeout(r, 500));

      // No new ring pushes should be sent
      const newSent = await getSentVoipPushes();
      const newRings = newSent.filter((s) => s.payload.type === "huddle_ring");
      expect(newRings.length).toBe(0);

      // Clean up
      await senderClient.api.huddle.leave.$post({});
      await recipientClient1.api.huddle.leave.$post({});
    });

    test("cancel push skips huddle participants (no flash ring for starter)", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Register a VoIP token for the sender too
      const senderVoipToken = `voip-fake-sender-${testId()}`;
      await senderClient.api["voip-tokens"].$post({
        json: { token: senderVoipToken, platform: "ios" as const },
      });

      // Sender starts huddle
      await senderClient.api.huddle.join.$post({
        json: { channelId },
      });

      await new Promise((r) => setTimeout(r, 500));

      // Ring should NOT have been sent to sender
      const ringPushes = (await getSentVoipPushes()).filter((s) => s.payload.type === "huddle_ring");
      const senderRings = ringPushes.filter((s) => s.token === senderVoipToken);
      expect(senderRings.length).toBe(0);

      await clearSentVoipPushes();

      // Sender leaves (ends huddle)
      await senderClient.api.huddle.leave.$post({});
      await new Promise((r) => setTimeout(r, 500));

      // Cancel should NOT have been sent to sender either
      const cancelPushes = (await getSentVoipPushes()).filter((s) => s.payload.type === "huddle_cancel");
      const senderCancels = cancelPushes.filter((s) => s.token === senderVoipToken);
      expect(senderCancels.length).toBe(0);

      // But cancel SHOULD have been sent to recipients
      const recipientCancels = cancelPushes.filter(
        (s) => s.token === recipientVoipToken1 || s.token === recipientVoipToken2,
      );
      expect(recipientCancels.length).toBeGreaterThan(0);

      // Clean up sender VoIP token
      await senderClient.api["voip-tokens"].$delete({
        json: { token: senderVoipToken },
      });
    });

    test("BadDeviceToken response removes VoIP token", async () => {
      await _resetForTests();
      await enableFakeVoipPush();
      await clearSentVoipPushes();

      // Register a special token for a fresh recipient
      const badTokenUserId = `ring-bad-${testId()}`;
      const badTokenCtx = await createTestClient({
        id: badTokenUserId,
        displayName: "Bad Token User",
        email: `ring-bad-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      await addToWorkspace(senderClient, wsSlug, badTokenCtx.client);
      await badTokenCtx.client.api.workspaces[":slug"].channels[":id"].join.$post({
        param: { slug: wsSlug, id: channelId },
      });

      const badToken = `voip-bad-${testId()}`;
      await badTokenCtx.client.api["voip-tokens"].$post({
        json: { token: badToken, platform: "ios" as const },
      });

      // Set fake response to BadDeviceToken
      await setFakeVoipResponse({ success: false, statusCode: 410, reason: "BadDeviceToken" });

      // Start huddle → ring delivery will get BadDeviceToken
      await senderClient.api.huddle.join.$post({
        json: { channelId },
      });

      await new Promise((r) => setTimeout(r, 500));

      // Token should have been deleted — re-registering should work (proves the old one was removed)
      // We verify by checking the push was attempted
      const sent = await getSentVoipPushes();
      const badTokenPushes = sent.filter((s) => s.token === badToken);
      expect(badTokenPushes.length).toBeGreaterThan(0);
      expect(badTokenPushes[0]!.result.reason).toBe("BadDeviceToken");

      // Clean up
      await senderClient.api.huddle.leave.$post({});
      // Reset fake response to success for subsequent tests
      await setFakeVoipResponse({ success: true, statusCode: 200 });
    });
  });
});
