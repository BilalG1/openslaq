import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, testId, createTestWorkspace, type TestApiClient } from "./helpers/api-client";
import type { BotScope } from "@openslaq/shared";

function getApiUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

/**
 * Unified scope enforcement tests.
 *
 * Tests the auth + scope matrix for all three token types:
 * - JWT (full access, no scopes)
 * - osk_ API key (user API key with explicit scopes)
 * - osb_ bot token (bot token with explicit scopes)
 */

// ── Helpers ────────────────────────────────────────────────────────────

async function createBotWithScopes(
  client: TestApiClient,
  slug: string,
  scopes: BotScope[],
) {
  const res = await client.api.workspaces[":slug"].bots.$post({
    param: { slug },
    json: {
      name: `Scope Bot ${testId()}`,
      webhookUrl: "https://example.com/webhook",
      scopes,
    },
  });
  expect(res.status).toBe(201);
  return (await res.json()) as unknown as { bot: { id: string; userId: string }; apiToken: string };
}

async function createApiKeyWithScopes(
  headers: Record<string, string>,
  scopes: string[],
) {
  const res = await fetch(`${getApiUrl()}/api/api-keys`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `Scope Key ${testId()}`, scopes }),
  });
  expect(res.status).toBe(201);
  const data = (await res.json()) as { token: string };
  return data.token;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("scope enforcement", () => {
  let slug: string;
  let channelId: string;
  let jwtHeaders: Record<string, string>;
  let jwtClient: TestApiClient;

  beforeAll(async () => {
    const id = testId();
    const { client, headers } = await createTestClient({
      id: `scope-test-${id}`,
      email: `scope-test-${id}@openslaq.dev`,
    });
    jwtClient = client;
    jwtHeaders = headers;

    const ws = await createTestWorkspace(client);
    slug = ws.slug;

    // Create a channel
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `scope-chan-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };
    channelId = channel.id;
  });

  // ── JWT: always full access ─────────────────────────────────────────

  describe("JWT tokens (full access)", () => {
    test("can send message", async () => {
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { ...jwtHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content: "JWT message" }),
      });
      expect(res.status).toBe(201);
    });

    test("can read messages", async () => {
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "GET",
        headers: jwtHeaders,
      });
      expect(res.status).toBe(200);
    });

    test("can list channels", async () => {
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels`, {
        method: "GET",
        headers: jwtHeaders,
      });
      expect(res.status).toBe(200);
    });
  });

  // ── API key scope enforcement ───────────────────────────────────────

  describe("API key scope enforcement", () => {
    test("key with chat:write can send message → 201", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, [
        "chat:write",
        "chat:read",
        "channels:read",
      ]);
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ content: "API key message" }),
      });
      expect(res.status).toBe(201);
    });

    test("key without chat:write cannot send message → 403", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, ["chat:read"]);
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ content: "Should fail" }),
      });
      expect(res.status).toBe(403);
    });

    test("key without chat:read cannot read messages → 403", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, ["chat:write"]);
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "GET",
        headers: authHeaders(token),
      });
      expect(res.status).toBe(403);
    });

    test("key without channels:read cannot list channels → 403", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, ["chat:write"]);
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels`, {
        method: "GET",
        headers: authHeaders(token),
      });
      expect(res.status).toBe(403);
    });

    test("key with channels:read can list channels → 200", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, ["channels:read"]);
      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels`, {
        method: "GET",
        headers: authHeaders(token),
      });
      expect(res.status).toBe(200);
    });

    test("key without reactions:write cannot toggle reaction → 403", async () => {
      // First create a message to react to
      const msgRes = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { ...jwtHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content: "React to this" }),
      });
      const msg = (await msgRes.json()) as { id: string };

      const token = await createApiKeyWithScopes(jwtHeaders, ["chat:read"]);
      const res = await fetch(`${getApiUrl()}/api/messages/${msg.id}/reactions`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ emoji: "thumbsup" }),
      });
      expect(res.status).toBe(403);
    });

    test("key with reactions:write can toggle reaction → 200", async () => {
      const msgRes = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { ...jwtHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content: "React to this too" }),
      });
      const msg = (await msgRes.json()) as { id: string };

      const token = await createApiKeyWithScopes(jwtHeaders, ["reactions:write"]);
      const res = await fetch(`${getApiUrl()}/api/messages/${msg.id}/reactions`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ emoji: "thumbsup" }),
      });
      expect(res.status).toBe(200);
    });

    test("key without users:read cannot get user profile → 403", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, ["chat:read"]);
      const res = await fetch(`${getApiUrl()}/api/users/me`, {
        method: "GET",
        headers: authHeaders(token),
      });
      expect(res.status).toBe(403);
    });

    test("key with users:read can get user profile → 200", async () => {
      const token = await createApiKeyWithScopes(jwtHeaders, ["users:read"]);
      const res = await fetch(`${getApiUrl()}/api/users/me`, {
        method: "GET",
        headers: authHeaders(token),
      });
      expect(res.status).toBe(200);
    });
  });

  // ── Bot token scope enforcement ─────────────────────────────────────

  describe("bot token scope enforcement", () => {
    test("bot with chat:write can send message → 201", async () => {
      const { bot, apiToken } = await createBotWithScopes(jwtClient, slug, [
        "chat:write",
        "chat:read",
        "channels:read",
      ]);
      // Add bot to channel
      await jwtClient.api.workspaces[":slug"].channels[":id"].members.$post({
        param: { slug, id: channelId },
        json: { userId: bot.userId },
      });

      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: authHeaders(apiToken),
        body: JSON.stringify({ content: "Bot scope message" }),
      });
      expect(res.status).toBe(201);
    });

    test("bot without chat:write cannot send message → 403", async () => {
      const { bot, apiToken } = await createBotWithScopes(jwtClient, slug, ["chat:read"]);
      await jwtClient.api.workspaces[":slug"].channels[":id"].members.$post({
        param: { slug, id: channelId },
        json: { userId: bot.userId },
      });

      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "POST",
        headers: authHeaders(apiToken),
        body: JSON.stringify({ content: "Should fail" }),
      });
      expect(res.status).toBe(403);
    });

    test("bot without chat:read cannot read messages → 403", async () => {
      const { bot, apiToken } = await createBotWithScopes(jwtClient, slug, ["chat:write"]);
      await jwtClient.api.workspaces[":slug"].channels[":id"].members.$post({
        param: { slug, id: channelId },
        json: { userId: bot.userId },
      });

      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
        method: "GET",
        headers: authHeaders(apiToken),
      });
      expect(res.status).toBe(403);
    });

    test("bot without channels:read cannot list channels → 403", async () => {
      const { apiToken } = await createBotWithScopes(jwtClient, slug, ["chat:write"]);

      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels`, {
        method: "GET",
        headers: authHeaders(apiToken),
      });
      expect(res.status).toBe(403);
    });

    test("bot with channels:join can join public channel → 200", async () => {
      // Create a new channel to join
      const chanRes = await jwtClient.api.workspaces[":slug"].channels.$post({
        param: { slug },
        json: { name: `bot-scope-join-${testId()}` },
      });
      const channel = (await chanRes.json()) as { id: string };

      const { apiToken } = await createBotWithScopes(jwtClient, slug, ["channels:join"]);

      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channel.id}/join`, {
        method: "POST",
        headers: authHeaders(apiToken),
      });
      expect(res.status).toBe(200);
    });

    test("bot without channels:join cannot join → 403", async () => {
      const chanRes = await jwtClient.api.workspaces[":slug"].channels.$post({
        param: { slug },
        json: { name: `bot-scope-nojoin-${testId()}` },
      });
      const channel = (await chanRes.json()) as { id: string };

      const { apiToken } = await createBotWithScopes(jwtClient, slug, ["chat:write"]);

      const res = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels/${channel.id}/join`, {
        method: "POST",
        headers: authHeaders(apiToken),
      });
      expect(res.status).toBe(403);
    });
  });

  // ── Bot workspace enforcement ───────────────────────────────────────

  describe("bot workspace enforcement", () => {
    test("bot cannot access different workspace → 403", async () => {
      const id = testId();
      const { client: otherClient } = await createTestClient({
        id: `scope-other-${id}`,
        email: `scope-other-${id}@openslaq.dev`,
      });
      const otherWs = await createTestWorkspace(otherClient);

      // Bot created in `slug` workspace
      const { apiToken } = await createBotWithScopes(jwtClient, slug, [
        "channels:read",
        "chat:read",
        "chat:write",
      ]);

      // Try to access a different workspace — bot is not a member, so resolveMemberRole rejects with 404
      const res = await fetch(`${getApiUrl()}/api/workspaces/${otherWs.slug}/channels`, {
        method: "GET",
        headers: authHeaders(apiToken),
      });
      // Bot is not a workspace member of the other workspace → 404 from resolveMemberRole
      expect([403, 404]).toContain(res.status);
    });
  });

  // ── Disabled bot and expired key ────────────────────────────────────

  describe("disabled bot and expired key", () => {
    test("disabled bot token → 403", async () => {
      const id = testId();
      const { client: freshClient } = await createTestClient({
        id: `scope-disabled-${id}`,
        email: `scope-disabled-${id}@openslaq.dev`,
      });
      const freshWs = await createTestWorkspace(freshClient);

      const { bot, apiToken } = await createBotWithScopes(freshClient, freshWs.slug, ["channels:read"]);

      // Disable the bot
      const toggleRes = await freshClient.api.workspaces[":slug"].bots[":botId"].toggle.$post({
        param: { slug: freshWs.slug, botId: bot.id },
        json: { enabled: false },
      });
      expect(toggleRes.status).toBe(200);

      const res = await fetch(`${getApiUrl()}/api/workspaces/${freshWs.slug}/channels`, {
        method: "GET",
        headers: authHeaders(apiToken),
      });
      expect(res.status).toBe(403);
    });

    test("expired API key → 401", async () => {
      // Use a fresh user to avoid rate limits from the main test user
      const id = testId();
      const { headers: freshHeaders } = await createTestClient({
        id: `scope-expired-${id}`,
        email: `scope-expired-${id}@openslaq.dev`,
      });

      // Create a key that expires immediately
      const res = await fetch(`${getApiUrl()}/api/api-keys`, {
        method: "POST",
        headers: { ...freshHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Expired Key ${testId()}`,
          scopes: ["chat:read"],
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
      });
      expect(res.status).toBe(201);
      const { token } = (await res.json()) as { token: string };

      const readRes = await fetch(`${getApiUrl()}/api/workspaces/${slug}/channels`, {
        method: "GET",
        headers: authHeaders(token),
      });
      expect(readRes.status).toBe(401);
    });
  });
});
