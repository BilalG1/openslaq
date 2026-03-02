import { describe, test, expect } from "bun:test";
import { createTestClient, testId, createTestWorkspace } from "./helpers/api-client";
import { db } from "../../api/src/db";
import { botApps } from "../../api/src/bots/schema";
import { eq } from "drizzle-orm";

function getApiUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}
function getTestSecret() {
  return process.env.E2E_TEST_SECRET ?? "openslaq-e2e-test-secret-do-not-use-in-prod";
}

async function createBotInWorkspace(
  client: any,
  slug: string,
  overrides: {
    scopes?: string[];
    subscribedEvents?: string[];
    webhookUrl?: string;
  } = {},
) {
  const res = await client.api.workspaces[":slug"].bots.$post({
    param: { slug },
    json: {
      name: `Webhook Bot ${testId()}`,
      webhookUrl: overrides.webhookUrl ?? `${getApiUrl()}/health`,
      scopes: overrides.scopes ?? ["chat:write", "chat:read", "reactions:read", "channels:members:read"],
      subscribedEvents: overrides.subscribedEvents ?? ["message:new"],
    },
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { bot: any; apiToken: string };
}

async function addBotToChannel(client: any, slug: string, channelId: string, botUserId: string) {
  await client.api.workspaces[":slug"].channels[":id"].members.$post({
    param: { slug, id: channelId },
    json: { userId: botUserId },
  });
}

async function getWebhookDeliveries(botAppId: string) {
  const res = await fetch(`${getApiUrl()}/api/test/webhook-deliveries/${botAppId}`, {
    headers: { Authorization: `Bearer ${getTestSecret()}` },
  });
  return (await res.json()) as any[];
}

async function waitForDeliveries(botAppId: string, minCount: number, timeoutMs = 5000): Promise<any[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const deliveries = await getWebhookDeliveries(botAppId);
    if (deliveries.length >= minCount) return deliveries;
    await new Promise((r) => setTimeout(r, 100));
  }
  return getWebhookDeliveries(botAppId);
}

/** Short poll to confirm no deliveries arrived (negative assertion). */
async function expectNoDeliveries(botAppId: string) {
  await new Promise((r) => setTimeout(r, 300));
  const deliveries = await getWebhookDeliveries(botAppId);
  expect(deliveries.length).toBe(0);
}

describe("webhook dispatcher", () => {
  test("message:new triggers webhook delivery for subscribed bot", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-msg-${id}`, email: `wh-msg-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-chan-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    // Create bot subscribed to message:new, with reachable webhook
    const { bot } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write", "chat:read"],
      webhookUrl: `${getApiUrl()}/health`, // reachable endpoint → 200
    });

    // Add bot to channel
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Send a message as user → should trigger webhook
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "Trigger webhook" },
    });

    // Wait for async delivery
    const deliveries = await waitForDeliveries(bot.id, 1);
    expect(deliveries.length).toBeGreaterThanOrEqual(1);
    expect(deliveries[0].eventType).toBe("message:new");
    expect(deliveries[0].statusCode).toBe("200");
    expect(Number(deliveries[0].attempts)).toBe(1);
  });

  test("bot without required scope does not receive webhook", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-noscope-${id}`, email: `wh-noscope-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-noscope-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Bot subscribed to message:new but lacks chat:read scope
    const { bot } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write"], // missing chat:read
      webhookUrl: `${getApiUrl()}/health`,
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Send message
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "Should not trigger webhook" },
    });

    await expectNoDeliveries(bot.id);
  });

  test("bot not in channel does not receive webhook", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-nomem-${id}`, email: `wh-nomem-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-nomem-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Create bot but do NOT add to channel
    const { bot } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write", "chat:read"],
      webhookUrl: `${getApiUrl()}/health`,
    });

    // Send message
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "Bot not in channel" },
    });

    await expectNoDeliveries(bot.id);
  });

  test("webhook to unreachable URL retries and logs failure", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-fail-${id}`, email: `wh-fail-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-fail-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Bot with unreachable webhook URL
    const { bot } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write", "chat:read"],
      webhookUrl: "http://127.0.0.1:1/webhook", // connection refused
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Send message → triggers webhook that will fail
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "Trigger failing webhook" },
    });

    // Wait for retries (3 attempts — fast backoff in test mode)
    const deliveries = await waitForDeliveries(bot.id, 1);
    expect(deliveries.length).toBeGreaterThanOrEqual(1);
    expect(deliveries[0].statusCode).toBe("error");
    expect(Number(deliveries[0].attempts)).toBe(3); // max retries
  });

  test("bot's own message excluded via excludeBotUserId", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-excl-${id}`, email: `wh-excl-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-excl-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Create bot subscribed to message:new
    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write", "chat:read"],
      webhookUrl: `${getApiUrl()}/health`,
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends a message (should NOT trigger webhook for itself)
    await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Bot self-message" }),
    });

    await expectNoDeliveries(bot.id);
  });

  test("disabled bot does not receive webhooks", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-dis-${id}`, email: `wh-dis-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-dis-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write", "chat:read"],
      webhookUrl: `${getApiUrl()}/health`,
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Disable the bot
    await client.api.workspaces[":slug"].bots[":botId"].toggle.$post({
      param: { slug: ws.slug, botId: bot.id },
      json: { enabled: false },
    });

    // Send message
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "Should not reach disabled bot" },
    });

    await expectNoDeliveries(bot.id);
  });

  test("bot interaction endpoint: message not found → 404", async () => {
    const id = testId();
    const { client, headers } = await createTestClient({ id: `wh-msgdel-${id}`, email: `wh-msgdel-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-msgdel-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      scopes: ["chat:write", "chat:read"],
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Delete me",
        actions: [{ id: "btn", type: "button", label: "Click" }],
      }),
    });
    const msg = (await msgRes.json()) as { id: string };

    // Bot deletes the message
    await fetch(`${getApiUrl()}/api/bot/messages/${msg.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    // Try interaction on deleted message → 404 (message_actions cascade deleted)
    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/btn`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(404);
  });

  test("bot interaction: disabled bot → 404", async () => {
    const id = testId();
    const { client, headers } = await createTestClient({ id: `wh-botdis-${id}`, email: `wh-botdis-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-botdis-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      scopes: ["chat:write", "chat:read"],
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Disable me",
        actions: [{ id: "btn", type: "button", label: "Click" }],
      }),
    });
    const msg = (await msgRes.json()) as { id: string };

    // Disable the bot
    await client.api.workspaces[":slug"].bots[":botId"].toggle.$post({
      param: { slug: ws.slug, botId: bot.id },
      json: { enabled: false },
    });

    // Try interaction → 404 (bot not available)
    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/btn`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(404);
  });

  test("bot interaction: bogus actionId → 404", async () => {
    const id = testId();
    const { client, headers } = await createTestClient({ id: `wh-badact-${id}`, email: `wh-badact-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-badact-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      scopes: ["chat:write", "chat:read"],
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Has actions",
        actions: [{ id: "real-btn", type: "button", label: "Click" }],
      }),
    });
    const msg = (await msgRes.json()) as { id: string };

    // Try interaction with non-existent actionId → 404
    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/bogus-action-id`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Action not found");
  });

  test("bot interaction: user not in channel → 403", async () => {
    const id = testId();
    const { client: owner } = await createTestClient({ id: `wh-notmem-${id}`, email: `wh-notmem-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(owner);

    const chanRes = await owner.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-notmem-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotInWorkspace(owner, ws.slug, {
      scopes: ["chat:write", "chat:read"],
    });
    await addBotToChannel(owner, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Members only",
        actions: [{ id: "btn", type: "button", label: "Click" }],
      }),
    });
    const msg = (await msgRes.json()) as { id: string };

    // Create second user who is NOT in the channel
    const id2 = testId();
    const { headers: outsiderHeaders } = await createTestClient({ id: `wh-out-${id2}`, email: `wh-out-${id2}@openslaq.dev` });

    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/btn`, {
      method: "POST",
      headers: outsiderHeaders,
    });
    expect(res.status).toBe(403);
  });

  test("bot interaction: webhook returns updateMessage → message updated", async () => {
    const id = testId();
    const { client, headers } = await createTestClient({ id: `wh-upd-${id}`, email: `wh-upd-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-upd-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Bot with webhook that returns updateMessage response
    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      scopes: ["chat:write", "chat:read"],
      webhookUrl: `${getApiUrl()}/api/test/webhook-echo-update`,
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Click to update",
        actions: [{ id: "btn", type: "button", label: "Update", value: "v1" }],
      }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // User clicks the button → webhook returns updateMessage → message content changes
    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/btn`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(200);

    // Verify the message was actually updated
    const msgsRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: ws.slug, id: channel.id },
      query: {},
    });
    const data = (await msgsRes.json()) as { messages: any[] };
    const updated = data.messages.find((m: any) => m.id === msg.id);
    expect(updated).toBeDefined();
    expect(updated!.content).toBe("Updated by webhook");
  });

  test("bot interaction: disabled bot → 404", async () => {
    const id = testId();
    const { client, headers } = await createTestClient({ id: `wh-disabled-${id}`, email: `wh-disabled-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-disabled-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      scopes: ["chat:write", "chat:read"],
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Disable test",
        actions: [{ id: "btn", type: "button", label: "Click" }],
      }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Disable the bot
    await db.update(botApps).set({ enabled: false }).where(eq(botApps.id, bot.id));

    // Try interaction → 404 (bot not available)
    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/btn`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(404);

    // Re-enable for cleanup
    await db.update(botApps).set({ enabled: true }).where(eq(botApps.id, bot.id));
  });

  test("bot interaction: webhook connection failure → 200 (graceful)", async () => {
    const id = testId();
    const { client, headers } = await createTestClient({ id: `wh-fail-${id}`, email: `wh-fail-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-fail-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Bot with webhook URL pointing to a port nothing listens on → ECONNREFUSED
    const { bot, apiToken } = await createBotInWorkspace(client, ws.slug, {
      scopes: ["chat:write", "chat:read"],
      webhookUrl: "http://127.0.0.1:19999/nonexistent",
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    // Bot sends message with action
    const msgRes = await fetch(`${getApiUrl()}/api/bot/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Fail test",
        actions: [{ id: "btn", type: "button", label: "Click" }],
      }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // User clicks the button → webhook fails → still returns 200
    const res = await fetch(`${getApiUrl()}/api/bot-interactions/${msg.id}/actions/btn`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(200);
  });

  test("webhook to failing URL (500) retries and logs", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `wh-500-${id}`, email: `wh-500-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(client);

    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `wh-500-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };

    // Bot with webhook that returns 500 (we use /api/test/reset-rate-limits without auth → 401)
    const { bot } = await createBotInWorkspace(client, ws.slug, {
      subscribedEvents: ["message:new"],
      scopes: ["chat:write", "chat:read"],
      webhookUrl: `${getApiUrl()}/api/test/reset-rate-limits`, // POST without auth → 401
    });
    await addBotToChannel(client, ws.slug, channel.id, bot.userId);

    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: "Trigger 401 webhook" },
    });

    // Wait for retries (fast backoff in test mode)
    const deliveries = await waitForDeliveries(bot.id, 1);
    expect(deliveries.length).toBeGreaterThanOrEqual(1);
    // 401 is not res.ok so it should retry and log failure
    expect(deliveries[0].statusCode).toBe("401");
    expect(Number(deliveries[0].attempts)).toBe(3);
  });
});
