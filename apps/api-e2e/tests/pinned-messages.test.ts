import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("pinned messages", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;
  let messageId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a channel
    const chRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `pin-test-${testId()}` },
    });
    const channel = (await chRes.json()) as { id: string };
    channelId = channel.id;

    // Send a message to pin
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "This is a pinnable message" },
    });
    const msg = (await msgRes.json()) as { id: string };
    messageId = msg.id;
  });

  test("pin message → 200", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });
    expect(res.status).toBe(200);
  });

  test("list pins includes pinned message", async () => {
    // Ensure pinned
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].pins.$get({
      param: { slug, id: channelId },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { messages: Array<{ id: string }> };
    expect(data.messages.some((m) => m.id === messageId)).toBe(true);
  });

  test("isPinned=true on message in regular message list", async () => {
    // Ensure pinned
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { messages: Array<{ id: string; isPinned?: boolean; pinnedBy?: string; pinnedAt?: string }> };
    const pinned = data.messages.find((m) => m.id === messageId);
    expect(pinned).toBeDefined();
    expect(pinned!.isPinned).toBe(true);
    expect(pinned!.pinnedBy).toBeDefined();
    expect(pinned!.pinnedAt).toBeDefined();
  });

  test("pin creates system message in channel", async () => {
    // Send a new message and pin it
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "Pin system message test" },
    });
    const msg = (await msgRes.json()) as { id: string };

    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId: msg.id },
    });

    // Check messages for system message
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const data = (await listRes.json()) as { messages: Array<{ content: string }> };
    const systemMsg = data.messages.find((m) => m.content.includes("pinned a message"));
    expect(systemMsg).toBeDefined();
  });

  test("unpin message → 200", async () => {
    // Ensure pinned first
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$delete({
      param: { slug, id: channelId, messageId },
    });
    expect(res.status).toBe(200);
  });

  test("after unpin, message not in pins list", async () => {
    // Pin then unpin
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$delete({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].pins.$get({
      param: { slug, id: channelId },
    });
    const data = (await res.json()) as { messages: Array<{ id: string }> };
    expect(data.messages.some((m) => m.id === messageId)).toBe(false);
  });

  test("pin non-existent message → 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId: fakeId },
    });
    expect(res.status).toBe(404);
  });

  test("pin by non-member → 403", async () => {
    const ctx2 = await createTestClient({
      id: `pin-nonmember-${testId()}`,
      displayName: "Non-Member Pinner",
      email: `pin-nonmember-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    const res = await ctx2.client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });
    expect([403, 404]).toContain(res.status);
  });

  test("pin count returns 0 for empty channel", async () => {
    // Create a fresh channel with no pins
    const chRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `pin-count-empty-${testId()}` },
    });
    const ch = (await chRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].channels[":id"]["pin-count"].$get({
      param: { slug, id: ch.id },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { count: number };
    expect(data.count).toBe(0);
  });

  test("pin count reflects pinned messages", async () => {
    // Ensure the message is pinned
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"]["pin-count"].$get({
      param: { slug, id: channelId },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { count: number };
    expect(data.count).toBeGreaterThanOrEqual(1);
  });

  test("pin count decreases after unpin", async () => {
    // Pin, get count, unpin, get count again
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });

    const res1 = await client.api.workspaces[":slug"].channels[":id"]["pin-count"].$get({
      param: { slug, id: channelId },
    });
    const before = (await res1.json()) as { count: number };

    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$delete({
      param: { slug, id: channelId, messageId },
    });

    const res2 = await client.api.workspaces[":slug"].channels[":id"]["pin-count"].$get({
      param: { slug, id: channelId },
    });
    const after = (await res2.json()) as { count: number };
    expect(after.count).toBe(before.count - 1);
  });

  test("pin is idempotent (double-pin no error)", async () => {
    const res1 = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });
    expect(res1.status).toBe(200);

    const res2 = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug, id: channelId, messageId },
    });
    expect(res2.status).toBe(200);

    // Should only appear once in pins list
    const listRes = await client.api.workspaces[":slug"].channels[":id"].pins.$get({
      param: { slug, id: channelId },
    });
    const data = (await listRes.json()) as { messages: Array<{ id: string }> };
    const count = data.messages.filter((m) => m.id === messageId).length;
    expect(count).toBe(1);
  });
});
