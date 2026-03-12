import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, testId, createTestWorkspace, addToWorkspace, TestApiClient } from "./helpers/api-client";

describe("bot admin API", () => {
  let client: TestApiClient;
  let slug: string;

  beforeAll(async () => {
    const id = testId();
    ({ client } = await createTestClient({ id: `bot-${id}`, email: `bot-${id}@openslaq.dev` }));
    const ws = await createTestWorkspace(client);
    slug = ws.slug;
  });

  test("create bot → 201 with API token", async () => {
    const res = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Test Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write", "chat:read"],
        subscribedEvents: ["message:new"],
      },
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as { bot: any; apiToken: string };
    expect(data.bot.id).toBeDefined();
    expect(data.bot.name).toMatch(/Test Bot/);
    expect(data.bot.userId).toMatch(/^bot:/);
    expect(data.bot.scopes).toEqual(["chat:write", "chat:read"]);
    expect(data.bot.subscribedEvents).toEqual(["message:new"]);
    expect(data.bot.enabled).toBe(true);
    expect(data.apiToken).toMatch(/^osb_/);
  });

  test("list bots → returns created bots", async () => {
    // Create a bot
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `List Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(createRes.status).toBe(201);

    // List bots
    const listRes = await client.api.workspaces[":slug"].bots.$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const bots = (await listRes.json()) as any[];
    expect(bots.length).toBeGreaterThanOrEqual(1);
    expect(bots.some((b) => b.name.startsWith("List Bot"))).toBe(true);
  });

  test("get bot by ID → 200", async () => {
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Get Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:read"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };

    const getRes = await client.api.workspaces[":slug"].bots[":botId"].$get({
      param: { slug, botId: bot.id },
    });
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as any;
    expect(fetched.id).toBe(bot.id);
    expect(fetched.name).toBe(bot.name);
  });

  test("update bot → 200", async () => {
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Update Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };

    const updateRes = await client.api.workspaces[":slug"].bots[":botId"].$put({
      param: { slug, botId: bot.id },
      json: {
        name: "Updated Name",
        description: "New description",
        scopes: ["chat:write", "chat:read"],
      },
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as any;
    expect(updated.name).toBe("Updated Name");
    expect(updated.description).toBe("New description");
    expect(updated.scopes).toContain("chat:read");
  });

  test("delete bot → 200", async () => {
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Delete Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };

    const delRes = await client.api.workspaces[":slug"].bots[":botId"].$delete({
      param: { slug, botId: bot.id },
    });
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const getRes = await client.api.workspaces[":slug"].bots[":botId"].$get({
      param: { slug, botId: bot.id },
    });
    expect(getRes.status as number).toBe(404);
  });

  test("regenerate token → returns new token", async () => {
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Regen Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot, apiToken: oldToken } = (await createRes.json()) as { bot: any; apiToken: string };

    const regenRes = await client.api.workspaces[":slug"].bots[":botId"]["regenerate-token"].$post({
      param: { slug, botId: bot.id },
    });
    expect(regenRes.status).toBe(200);
    const { apiToken: newToken } = (await regenRes.json()) as { apiToken: string };
    expect(newToken).toMatch(/^osb_/);
    expect(newToken).not.toBe(oldToken);
  });

  test("toggle bot → enables/disables", async () => {
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Toggle Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };

    // Disable
    const toggleRes = await client.api.workspaces[":slug"].bots[":botId"].toggle.$post({
      param: { slug, botId: bot.id },
      json: { enabled: false },
    });
    expect(toggleRes.status).toBe(200);

    // Verify disabled
    const getRes = await client.api.workspaces[":slug"].bots[":botId"].$get({
      param: { slug, botId: bot.id },
    });
    const fetched = (await getRes.json()) as any;
    expect(fetched.enabled).toBe(false);
  });

  test("update bot subscribed events → replaces subscriptions", async () => {
    // Create bot with events A, B
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Sub Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write", "chat:read", "reactions:read"],
        subscribedEvents: ["message:new", "message:updated"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };
    expect(bot.subscribedEvents).toEqual(["message:new", "message:updated"]);

    // Update to events A, C (remove B, add C)
    const updateRes = await client.api.workspaces[":slug"].bots[":botId"].$put({
      param: { slug, botId: bot.id },
      json: {
        subscribedEvents: ["message:new", "reaction:updated"],
      },
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as any;
    expect(updated.subscribedEvents).toContain("message:new");
    expect(updated.subscribedEvents).toContain("reaction:updated");
    expect(updated.subscribedEvents).not.toContain("message:updated");
  });

  test("update bot subscribed events to empty list → clears subscriptions", async () => {
    const createRes = await client.api.workspaces[":slug"].bots.$post({
      param: { slug },
      json: {
        name: `Clear Sub Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
        subscribedEvents: ["message:new"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };

    const updateRes = await client.api.workspaces[":slug"].bots[":botId"].$put({
      param: { slug, botId: bot.id },
      json: { subscribedEvents: [] },
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as any;
    expect(updated.subscribedEvents).toEqual([]);
  });

  test("list bots with mixed subscriptions → all returned correctly", async () => {
    // Use a fresh workspace to control exact bot count
    const id = testId();
    const { client: freshClient } = await createTestClient({ id: `bot-mixsub-${id}`, email: `bot-mixsub-${id}@openslaq.dev` });
    const ws = await createTestWorkspace(freshClient);

    // Create bot with events
    await freshClient.api.workspaces[":slug"].bots.$post({
      param: { slug: ws.slug },
      json: {
        name: `With Events ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
        subscribedEvents: ["message:new", "message:deleted"],
      },
    });

    // Create bot without events
    await freshClient.api.workspaces[":slug"].bots.$post({
      param: { slug: ws.slug },
      json: {
        name: `No Events ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });

    const listRes = await freshClient.api.workspaces[":slug"].bots.$get({
      param: { slug: ws.slug },
    });
    expect(listRes.status).toBe(200);
    const bots = (await listRes.json()) as any[];
    expect(bots.length).toBeGreaterThanOrEqual(2);

    const withEvents = bots.find((b) => b.name.startsWith("With Events"));
    const noEvents = bots.find((b) => b.name.startsWith("No Events"));
    expect(withEvents?.subscribedEvents.length).toBe(2);
    expect(noEvents?.subscribedEvents.length).toBe(0);
  });

  test("non-admin cannot list bots → 403", async () => {
    const id2 = testId();
    const { client: memberClient } = await createTestClient({ id: `bot-member-${id2}`, email: `bot-member-${id2}@openslaq.dev` });
    await addToWorkspace(client, slug, memberClient);

    const res = await memberClient.api.workspaces[":slug"].bots.$get({
      param: { slug },
    });
    expect(res.status as number).toBe(403);
  });

  test("cross-workspace bot IDs are not accessible → 404", async () => {
    const id = testId();
    const { client: clientA } = await createTestClient({
      id: `bot-wsa-${id}`,
      email: `bot-wsa-${id}@openslaq.dev`,
    });
    const wsA = await createTestWorkspace(clientA);

    const { client: clientB } = await createTestClient({
      id: `bot-wsb-${id}`,
      email: `bot-wsb-${id}@openslaq.dev`,
    });
    const wsB = await createTestWorkspace(clientB);

    const createRes = await clientB.api.workspaces[":slug"].bots.$post({
      param: { slug: wsB.slug },
      json: {
        name: `Cross Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write"],
      },
    });
    expect(createRes.status).toBe(201);
    const { bot } = (await createRes.json()) as { bot: any };

    const getRes = await clientA.api.workspaces[":slug"].bots[":botId"].$get({
      param: { slug: wsA.slug, botId: bot.id },
    });
    expect(getRes.status).toBe(404);

    const updateRes = await clientA.api.workspaces[":slug"].bots[":botId"].$put({
      param: { slug: wsA.slug, botId: bot.id },
      json: { name: "hijacked" },
    });
    expect(updateRes.status).toBe(404);

    const regenRes = await clientA.api.workspaces[":slug"].bots[":botId"]["regenerate-token"].$post({
      param: { slug: wsA.slug, botId: bot.id },
    });
    expect(regenRes.status).toBe(404);

    const toggleRes = await clientA.api.workspaces[":slug"].bots[":botId"].toggle.$post({
      param: { slug: wsA.slug, botId: bot.id },
      json: { enabled: false },
    });
    expect(toggleRes.status).toBe(404);

    const deleteRes = await clientA.api.workspaces[":slug"].bots[":botId"].$delete({
      param: { slug: wsA.slug, botId: bot.id },
    });
    expect(deleteRes.status).toBe(404);

    const stillThereRes = await clientB.api.workspaces[":slug"].bots[":botId"].$get({
      param: { slug: wsB.slug, botId: bot.id },
    });
    expect(stillThereRes.status).toBe(200);
    const stillThere = (await stillThereRes.json()) as any;
    expect(stillThere.id).toBe(bot.id);
    expect(stillThere.name).toContain("Cross Bot");
    expect(stillThere.enabled).toBe(true);
  });
});
