import { describe, test, expect } from "bun:test";
import { createTestClient, testId, createTestWorkspace, TestApiClient } from "./helpers/api-client";

function getApiUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

async function createBotWithToken(client: TestApiClient, slug: string) {
  const res = await client.api.workspaces[":slug"].bots.$post({
    param: { slug },
    json: {
      name: `API Bot ${testId()}`,
      webhookUrl: "https://example.com/webhook",
      scopes: ["chat:write", "chat:read", "channels:read", "reactions:write", "users:read", "channels:members:read"],
      subscribedEvents: ["message:new"],
    },
  });
  expect(res.status).toBe(201);
  const data = (await res.json()) as { bot: any; apiToken: string };
  return data;
}

async function addBotToChannel(client: TestApiClient, slug: string, channelId: string, botUserId: string) {
  const res = await client.api.workspaces[":slug"].channels[":id"].members.$post({
    param: { slug, id: channelId },
    json: { userId: botUserId },
  });
  // May be 201 or other status if member already exists
  return res;
}

describe("bot-facing API", () => {
  test("bot sends message with auth token → 201", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-send-${id}`, email: `botapi-send-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    // Create a channel
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-chan-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    // Create bot
    const { bot, apiToken } = await createBotWithToken(client, ws.slug);

    // Add bot to channel
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Send message as bot
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Hello from bot!" }),
    });
    expect(msgRes.status).toBe(201);
    const msg = await msgRes.json() as any;
    expect(msg.content).toBe("Hello from bot!");
    expect(msg.userId).toBe(bot.userId);
    expect(msg.isBot).toBe(true);
  });

  test("bot sends message with actions → 201", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-act-${id}`, email: `botapi-act-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-actions-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "Do you approve?",
        actions: [
          { id: "approve", type: "button", label: "Approve", style: "primary" },
          { id: "reject", type: "button", label: "Reject", style: "danger" },
        ],
      }),
    });
    expect(msgRes.status).toBe(201);
    const msg = await msgRes.json() as any;
    expect(msg.actions).toHaveLength(2);
    expect(msg.actions[0].id).toBe("approve");
    expect(msg.actions[1].id).toBe("reject");
  });

  test("bot reads channel messages → 200", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-read-${id}`, email: `botapi-read-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-read-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    // Post a message as user
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "User message" },
    });

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    const readRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(readRes.status).toBe(200);
    const data = await readRes.json() as any;
    expect(data.messages.length).toBeGreaterThanOrEqual(1);
    expect(data.messages.some((m: any) => m.content === "User message")).toBe(true);
  });

  test("bot lists channels → 200", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-list-${id}`, email: `botapi-list-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    // Create channels and add bot
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-list-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    const listRes = await fetch(`${getApiUrl()}/api/bot/channels`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(listRes.status).toBe(200);
    const channels = await listRes.json() as any[];
    expect(channels.length).toBeGreaterThanOrEqual(1);
  });

  test("invalid bot token → 401", async () => {
    const res = await fetch(`${getApiUrl()}/api/bot/channels`, {
      method: "GET",
      headers: { Authorization: "Bearer osb_invalid_token" },
    });
    expect(res.status).toBe(401);
  });

  test("bot not in channel → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-noacc-${id}`, email: `botapi-noacc-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-noaccess-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    // Create bot but DON'T add to channel
    const { apiToken } = await createBotWithToken(client, ws.slug);

    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Should fail" }),
    });
    expect(msgRes.status).toBe(403);
  });

  test("disabled bot → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-dis-${id}`, email: `botapi-dis-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);

    // Disable the bot
    await client.api.workspaces[":slug"].bots[":botId"].toggle.$post({
      param: { slug: ws.slug, botId: bot.id },
      json: { enabled: false },
    });

    const res = await fetch(`${getApiUrl()}/api/bot/channels`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status).toBe(403);
  });

  test("bot without required scope → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-scope-${id}`, email: `botapi-scope-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    // Create bot with only chat:write (no chat:read)
    const res = await client.api.workspaces[":slug"].bots.$post({
      param: { slug: ws.slug },
      json: {
        name: `No Read Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(res.status).toBe(201);
    const { bot, apiToken } = (await res.json()) as { bot: any; apiToken: string };

    // Try to read (requires chat:read)
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `noscope-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    const readRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(readRes.status).toBe(403);
  });

  test("bot updates own message → 200", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-upd-${id}`, email: `botapi-upd-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-upd-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with actions
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Original content",
        actions: [{ id: "btn1", type: "button", label: "Old" }],
      }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Bot updates the message
    const updRes = await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Updated content",
        actions: [{ id: "btn1", type: "button", label: "New" }],
      }),
    });
    expect(updRes.status).toBe(200);
    const updated = (await updRes.json()) as any;
    expect(updated.content).toBe("Updated content");
    expect(updated.actions[0].label).toBe("New");
  });

  test("bot cannot update another user's message → 404", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-updother-${id}`, email: `botapi-updother-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-updother-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // User sends a message
    const userMsgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "User's message" },
    });
    const userMsg = (await userMsgRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot tries to update user's message → 404
    const updRes = await fetch(`${getApiUrl()}/api/bot/messages/${userMsg.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hacked" }),
    });
    expect(updRes.status).toBe(404);
  });

  test("bot deletes own message → 200", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-del-${id}`, email: `botapi-del-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-del-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Delete me" }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Bot deletes message
    const delRes = await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(delRes.status).toBe(200);
    const body = (await delRes.json()) as any;
    expect(body.ok).toBe(true);
  });

  test("bot deletes nonexistent message → 404", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-delnf-${id}`, email: `botapi-delnf-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const { apiToken } = await createBotWithToken(client, ws.slug);

    const delRes = await fetch(`${getApiUrl()}/api/bot/messages/00000000-0000-0000-0000-000000000000`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(delRes.status).toBe(404);
  });

  test("bot reads messages when not in channel → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-readnm-${id}`, email: `botapi-readnm-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-readnm-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Create bot but do NOT add to channel
    const { apiToken } = await createBotWithToken(client, ws.slug);

    const readRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(readRes.status).toBe(403);
  });

  test("bot lists members when not in channel → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-membnm-${id}`, email: `botapi-membnm-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-membnm-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { apiToken } = await createBotWithToken(client, ws.slug);

    const res = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/members`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status).toBe(403);
  });

  test("bot lists members when in channel → 200", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-memb-${id}`, email: `botapi-memb-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-memb-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    const res = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/members`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as any[];
    expect(members.length).toBeGreaterThanOrEqual(1);
  });

  test("bot toggles reaction on message → 200", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-react-${id}`, email: `botapi-react-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-react-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Send a message as bot
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "React to me" }),
    });
    const msg = (await msgRes.json()) as { id: string };

    // Toggle reaction on
    const reactRes = await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: "thumbsup" }),
    });
    expect(reactRes.status).toBe(200);
    const reactData = (await reactRes.json()) as { reactions: any[] };
    expect(reactData.reactions.some((r: any) => r.emoji === "thumbsup")).toBe(true);

    // Toggle reaction off
    const offRes = await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: "thumbsup" }),
    });
    expect(offRes.status).toBe(200);
    const offData = (await offRes.json()) as { reactions: any[] };
    expect(offData.reactions.some((r: any) => r.emoji === "thumbsup" && r.count > 0)).toBe(false);
  });

  test("bot reacts to message in non-member channel → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-reactnm-${id}`, email: `botapi-reactnm-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    // Create a channel and have the user post a message
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-reactnm-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };
    const userMsgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "User msg" },
    });
    const userMsg = (await userMsgRes.json()) as { id: string };

    // Create bot but do NOT add to channel
    const { apiToken } = await createBotWithToken(client, ws.slug);

    const res = await fetch(`${getApiUrl()}/api/bot/messages/${userMsg.id}/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: "thumbsup" }),
    });
    expect(res.status).toBe(403);
  });

  test("bot updates own message after leaving channel → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-updnm-${id}`, email: `botapi-updnm-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-updnm-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends a message
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Will leave" }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Remove bot from channel (owner kicks)
    await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug: ws.slug, id: channel.id, userId: bot.userId },
    });

    // Bot tries to update its own message → 403
    const updRes = await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Updated" }),
    });
    expect(updRes.status).toBe(403);
  });

  test("bot deletes own message after leaving channel → 403", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-delnm-${id}`, email: `botapi-delnm-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-delnm-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends a message
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Will leave" }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Remove bot from channel
    await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug: ws.slug, id: channel.id, userId: bot.userId },
    });

    // Bot tries to delete its own message → 403
    const delRes = await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(delRes.status).toBe(403);
  });

  test("bot reacts to nonexistent message → 404", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-reactnf-${id}`, email: `botapi-reactnf-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const { apiToken } = await createBotWithToken(client, ws.slug);

    const res = await fetch(`${getApiUrl()}/api/bot/messages/00000000-0000-0000-0000-000000000000/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: "thumbsup" }),
    });
    expect(res.status).toBe(404);
  });

  test("bot gets user info → 200", async () => {
    const id = testId();
    const { client, user } = await createTestClient({ id: `botapi-getuser-${id}`, email: `botapi-getuser-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const { apiToken } = await createBotWithToken(client, ws.slug);

    const res = await fetch(`${getApiUrl()}/api/bot/users/${user.id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe(user.id);
    expect(data.displayName).toBeDefined();
  });

  test("bot gets nonexistent user → 404", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-getusernf-${id}`, email: `botapi-getusernf-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const { apiToken } = await createBotWithToken(client, ws.slug);

    const res = await fetch(`${getApiUrl()}/api/bot/users/nonexistent-user-id`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status).toBe(404);
  });

  test("bot message shows isBot flag when fetched via user API", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `botapi-flag-${id}`, email: `botapi-flag-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `bot-flag-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotWithToken(client, ws.slug);
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message
    await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Bot message for flag test" }),
    });

    // User reads messages
    const msgsRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: channel.id },
      query: {},
    });
    expect(msgsRes.status).toBe(200);
    const data = (await msgsRes.json()) as { messages: any[] };
    const botMsg = data.messages.find((m) => m.content === "Bot message for flag test");
    expect(botMsg).toBeDefined();
    expect(botMsg!.isBot).toBe(true);
    expect(botMsg!.userId).toMatch(/^bot:/);
  });
});
