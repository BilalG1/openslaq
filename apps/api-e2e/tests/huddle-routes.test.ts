import { describe, test, expect, beforeAll, beforeEach, afterEach } from "bun:test";
import { AccessToken } from "livekit-server-sdk";
import { createHash } from "node:crypto";
import { RoomManager } from "@openslaq/huddle/server";
import { MAX_HUDDLE_PARTICIPANTS, MAX_TOTAL_HUDDLE_PARTICIPANTS } from "@openslaq/huddle/shared";
import { asUserId } from "@openslaq/shared";
import type { Message, HuddleMessageMetadata } from "@openslaq/shared";
import { addToWorkspace, createTestClient, createTestWorkspace, testId } from "./helpers/api-client";
import { roomManager } from "../../api/src/huddle/routes";
import { _resetForTests, getHuddleForChannel, joinHuddle } from "../../api/src/huddle/service";
import { closeOrphanedHuddleMessages } from "../../api/src/messages/service";

function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

function webhookRoomName(channelId: string): string {
  return RoomManager.roomNameForChannel(channelId);
}

async function signWebhookAuth(body: string): Promise<string> {
  const token = new AccessToken("devkey", "devsecret");
  token.sha256 = createHash("sha256").update(body).digest("base64");
  return await token.toJwt();
}

// Pre-create channels for webhook tests that call huddle service directly
let webhookChannelId1: string;
let webhookChannelId2: string;
let webhookChannelId3: string;
let webhookChannelId4: string;
let webhookUserId1: string;
let webhookUserId2: string;

beforeAll(async () => {
  const id = testId();
  const ctx1 = await createTestClient({
    id: `huddle-wh-u1-${id}`,
    displayName: "Webhook User 1",
    email: `huddle-wh-u1-${id}@openslaq.dev`,
  });
  const ctx2 = await createTestClient({
    id: `huddle-wh-u2-${id}`,
    displayName: "Webhook User 2",
    email: `huddle-wh-u2-${id}@openslaq.dev`,
  });
  webhookUserId1 = ctx1.user.id;
  webhookUserId2 = ctx2.user.id;

  const ws = await createTestWorkspace(ctx1.client);
  await addToWorkspace(ctx1.client, ws.slug, ctx2.client);

  async function createChannel(name: string) {
    const res = await ctx1.client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name },
    });
    if (res.status !== 201) throw new Error(`Channel create failed: ${res.status}`);
    const ch = (await res.json()) as { id: string };
    // Have user2 join too
    await ctx2.client.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug: ws.slug, id: ch.id },
    });
    return ch.id;
  }

  webhookChannelId1 = await createChannel(`wh-ch1-${id}`);
  webhookChannelId2 = await createChannel(`wh-ch2-${id}`);
  webhookChannelId3 = await createChannel(`wh-ch3-${id}`);
  webhookChannelId4 = await createChannel(`wh-ch4-${id}`);
});

describe("huddle routes", () => {
  const originalListParticipants = roomManager.listParticipants.bind(roomManager);
  const originalEnsureRoom = roomManager.ensureRoom.bind(roomManager);
  const originalGetTotalParticipantCount = roomManager.getTotalParticipantCount.bind(roomManager);

  beforeEach(async () => {
    await _resetForTests();
    roomManager.listParticipants = originalListParticipants;
    roomManager.ensureRoom = originalEnsureRoom;
    roomManager.getTotalParticipantCount = originalGetTotalParticipantCount;
  });

  afterEach(() => {
    roomManager.listParticipants = originalListParticipants;
    roomManager.ensureRoom = originalEnsureRoom;
    roomManager.getTotalParticipantCount = originalGetTotalParticipantCount;
  });

  test("POST /api/huddle/join returns 403 for non-channel-member", async () => {
    const owner = await createTestClient();
    const outsider = await createTestClient({
      id: `huddle-outsider-${testId()}`,
      email: `huddle-outsider-${testId()}@openslaq.dev`,
    });

    const ws = await createTestWorkspace(owner.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();

    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...outsider.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general!.id }),
    });
    expect(joinRes.status).toBe(403);
  });

  test("POST /api/huddle/join returns 409 when room is full", async () => {
    const owner = await createTestClient({ id: `huddle-owner-${testId()}`, email: `huddle-owner-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();

    roomManager.listParticipants = async () =>
      Array.from({ length: MAX_HUDDLE_PARTICIPANTS }, (_, i) => ({ identity: `u-${i}` })) as unknown as Awaited<ReturnType<typeof roomManager.listParticipants>>;
    roomManager.ensureRoom = async () => {
      throw new Error("ensureRoom should not run when room is full");
    };

    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general!.id }),
    });
    expect(joinRes.status).toBe(409);
  });

  test("POST /api/huddle/join returns 503 when server is at capacity", async () => {
    const owner = await createTestClient({ id: `huddle-cap-${testId()}`, email: `huddle-cap-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();

    roomManager.getTotalParticipantCount = async () => MAX_TOTAL_HUDDLE_PARTICIPANTS;

    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general!.id }),
    });
    expect(joinRes.status).toBe(503);
  });

  test("POST /api/huddle/join returns token for channel member", async () => {
    const owner = await createTestClient({ id: `huddle-join-${testId()}`, email: `huddle-join-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();

    roomManager.listParticipants = async () => [];
    roomManager.ensureRoom = async (channelId: string) => webhookRoomName(channelId);

    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general!.id }),
    });
    expect(joinRes.status).toBe(200);

    const body = (await joinRes.json()) as { token: string; wsUrl: string; roomName: string };
    expect(body.token).toBeString();
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.wsUrl).toMatch(/^wss?:\/\//);
    expect(body.roomName).toBe(webhookRoomName(general!.id));
    expect(await getHuddleForChannel(general!.id)).not.toBeNull();
  });

  test("POST /api/huddle/webhook handles invalid signatures gracefully", async () => {
    const res = await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: {
        Authorization: "invalid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "participant_joined" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Webhook verification failed");
  });

  test("POST /api/huddle/webhook participant_joined updates huddle state", async () => {
    const payload = JSON.stringify({
      event: "participant_joined",
      room: { name: webhookRoomName(webhookChannelId1) },
      participant: { identity: webhookUserId1 },
    });
    const auth = await signWebhookAuth(payload);

    const res = await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: payload,
    });
    expect(res.status).toBe(200);

    const huddle = await getHuddleForChannel(webhookChannelId1);
    expect(huddle).not.toBeNull();
    expect(huddle!.participants.some((p) => p.userId === webhookUserId1)).toBe(true);
  });

  test("POST /api/huddle/webhook participant_left emits update when others remain", async () => {
    await joinHuddle(webhookChannelId2, webhookUserId1);
    await joinHuddle(webhookChannelId2, webhookUserId2);

    const payload = JSON.stringify({
      event: "participant_left",
      room: { name: webhookRoomName(webhookChannelId2) },
      participant: { identity: webhookUserId2 },
    });
    const auth = await signWebhookAuth(payload);
    const res = await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: payload,
    });
    expect(res.status).toBe(200);

    const huddle = await getHuddleForChannel(webhookChannelId2);
    expect(huddle).not.toBeNull();
    expect(huddle!.participants).toHaveLength(1);
    expect(huddle!.participants[0]!.userId).toBe(asUserId(webhookUserId1));
  });

  test("POST /api/huddle/webhook participant_left ends huddle when last user leaves", async () => {
    await joinHuddle(webhookChannelId3, webhookUserId1);

    const payload = JSON.stringify({
      event: "participant_left",
      room: { name: webhookRoomName(webhookChannelId3) },
      participant: { identity: webhookUserId1 },
    });
    const auth = await signWebhookAuth(payload);
    const res = await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: payload,
    });
    expect(res.status).toBe(200);
    expect(await getHuddleForChannel(webhookChannelId3)).toBeNull();
  });

  test("POST /api/huddle/webhook room_finished branch handles active huddle", async () => {
    await joinHuddle(webhookChannelId4, webhookUserId1);

    const payload = JSON.stringify({
      event: "room_finished",
      room: { name: webhookRoomName(webhookChannelId4) },
    });
    const auth = await signWebhookAuth(payload);
    const res = await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: payload,
    });
    expect(res.status).toBe(200);
  });

  test("POST /api/huddle/join succeeds for invited member", async () => {
    const owner = await createTestClient({ id: `huddle-owner2-${testId()}`, email: `huddle-owner2-${testId()}@openslaq.dev` });
    const member = await createTestClient({ id: `huddle-member-${testId()}`, email: `huddle-member-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    await addToWorkspace(owner.client, ws.slug, member.client);

    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();

    roomManager.listParticipants = async () => [];
    roomManager.ensureRoom = async (channelId: string) => webhookRoomName(channelId);

    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...member.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general!.id }),
    });
    expect(joinRes.status).toBe(200);
  });

  test("first join creates a huddle system message", async () => {
    const owner = await createTestClient({ id: `huddle-sysmsg-${testId()}`, email: `huddle-sysmsg-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general")!;

    roomManager.listParticipants = async () => [];
    roomManager.ensureRoom = async (channelId: string) => webhookRoomName(channelId);

    // First join should create system message
    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general.id }),
    });
    expect(joinRes.status).toBe(200);

    // Verify system message exists in channel messages
    const messagesRes = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: general.id },
      query: {},
    });
    const messagesBody = (await messagesRes.json()) as { messages: Message[] };
    const huddleMsg = messagesBody.messages.find((m) => m.type === "huddle");
    expect(huddleMsg).toBeDefined();
    expect(huddleMsg!.userId).toBe(asUserId(owner.user.id));
    expect(huddleMsg!.content).toBe("");
    expect(huddleMsg!.metadata).toBeDefined();
    expect((huddleMsg!.metadata as HuddleMessageMetadata).huddleStartedAt).toBeTruthy();
    expect((huddleMsg!.metadata as HuddleMessageMetadata).huddleEndedAt).toBeUndefined();

    // Verify huddle state has messageId
    const huddle = await getHuddleForChannel(general.id);
    expect(huddle).not.toBeNull();
    expect(huddle!.messageId).toBe(huddleMsg!.id);
  });

  test("second join does NOT create another system message", async () => {
    const owner = await createTestClient({ id: `huddle-sysmsg2-${testId()}`, email: `huddle-sysmsg2-${testId()}@openslaq.dev` });
    const member = await createTestClient({ id: `huddle-sysmsg2-m-${testId()}`, email: `huddle-sysmsg2-m-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    await addToWorkspace(owner.client, ws.slug, member.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general")!;

    roomManager.listParticipants = async () => [];
    roomManager.ensureRoom = async (channelId: string) => webhookRoomName(channelId);

    // First join
    await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general.id }),
    });

    // Second join
    await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...member.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general.id }),
    });

    // Should still only have one huddle system message
    const messagesRes = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: general.id },
      query: {},
    });
    const messagesBody = (await messagesRes.json()) as { messages: Message[] };
    const huddleMsgs = messagesBody.messages.filter((m) => m.type === "huddle");
    expect(huddleMsgs).toHaveLength(1);
  });

  test("closeOrphanedHuddleMessages sets huddleEndedAt on open huddle messages", async () => {
    const owner = await createTestClient({ id: `huddle-orphan-${testId()}`, email: `huddle-orphan-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general")!;

    roomManager.listParticipants = async () => [];
    roomManager.ensureRoom = async (channelId: string) => webhookRoomName(channelId);

    // Join to create a huddle system message
    const joinRes = await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general.id }),
    });
    expect(joinRes.status).toBe(200);

    // Verify the huddle message exists without huddleEndedAt
    const msgsRes = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: general.id },
      query: {},
    });
    const msgsBody = (await msgsRes.json()) as { messages: Message[] };
    const huddleMsg = msgsBody.messages.find((m) => m.type === "huddle");
    expect(huddleMsg).toBeDefined();
    expect((huddleMsg!.metadata as HuddleMessageMetadata).huddleEndedAt).toBeUndefined();

    // Close orphaned huddle messages
    const closed = await closeOrphanedHuddleMessages();
    expect(closed).toBeGreaterThanOrEqual(1);

    // Verify the message now has huddleEndedAt
    const msgsRes2 = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: general.id },
      query: {},
    });
    const msgsBody2 = (await msgsRes2.json()) as { messages: Message[] };
    const updatedMsg = msgsBody2.messages.find((m) => m.id === huddleMsg!.id);
    expect(updatedMsg).toBeDefined();
    expect((updatedMsg!.metadata as HuddleMessageMetadata).huddleEndedAt).toBeTruthy();
  });

  test("huddle end updates system message with duration and participants", async () => {
    const owner = await createTestClient({ id: `huddle-end-msg-${testId()}`, email: `huddle-end-msg-${testId()}@openslaq.dev` });
    const member = await createTestClient({ id: `huddle-end-msg-m-${testId()}`, email: `huddle-end-msg-m-${testId()}@openslaq.dev` });
    const ws = await createTestWorkspace(owner.client);
    await addToWorkspace(owner.client, ws.slug, member.client);
    const channelsRes = await owner.client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as Array<{ id: string; name: string }>;
    const general = channels.find((c) => c.name === "general")!;

    roomManager.listParticipants = async () => [];
    roomManager.ensureRoom = async (channelId: string) => webhookRoomName(channelId);

    // Both join
    await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...owner.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general.id }),
    });
    await fetch(`${getBaseUrl()}/api/huddle/join`, {
      method: "POST",
      headers: { ...member.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: general.id }),
    });

    // Both leave via webhook (last one ends huddle)
    const payload1 = JSON.stringify({
      event: "participant_left",
      room: { name: webhookRoomName(general.id) },
      participant: { identity: owner.user.id },
    });
    await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: { Authorization: await signWebhookAuth(payload1), "Content-Type": "application/json" },
      body: payload1,
    });

    const payload2 = JSON.stringify({
      event: "participant_left",
      room: { name: webhookRoomName(general.id) },
      participant: { identity: member.user.id },
    });
    await fetch(`${getBaseUrl()}/api/huddle/webhook`, {
      method: "POST",
      headers: { Authorization: await signWebhookAuth(payload2), "Content-Type": "application/json" },
      body: payload2,
    });

    // Verify system message was updated with end info
    const messagesRes = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: general.id },
      query: {},
    });
    const messagesBody = (await messagesRes.json()) as { messages: Message[] };
    const huddleMsg = messagesBody.messages.find((m) => m.type === "huddle");
    expect(huddleMsg).toBeDefined();
    const meta = huddleMsg!.metadata as HuddleMessageMetadata;
    expect(meta.huddleEndedAt).toBeTruthy();
    expect(meta.duration).toBeGreaterThanOrEqual(0);
    expect(meta.finalParticipants).toBeDefined();
    expect(meta.finalParticipants!.length).toBeGreaterThanOrEqual(1);
  });
});
