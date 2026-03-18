import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("unread counts", () => {
  let client1: Awaited<ReturnType<typeof createTestClient>>["client"];
  let client2: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx1 = await createTestClient({
      id: `unread-user1-${testId()}`,
      displayName: "Unread User 1",
      email: `unread1-${testId()}@openslaq.dev`,
    });
    client1 = ctx1.client;

    const ctx2 = await createTestClient({
      id: `unread-user2-${testId()}`,
      displayName: "Unread User 2",
      email: `unread2-${testId()}@openslaq.dev`,
    });
    client2 = ctx2.client;

    const workspace = await createTestWorkspace(client1);
    slug = workspace.slug;

    // Create a channel (user1 auto-joins)
    const res = await client1.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `unread-${testId()}` },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;

    // User2 joins the workspace and channel via invite
    await addToWorkspace(client1, slug, client2);
    await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
  });

  test("fresh workspace has unread from join event", async () => {
    // Mark as read first to clear the channel_event from user2 joining
    await client1.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });

    const res = await client1.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const counts = (await res.json()) as Record<string, number>;
    // After marking as read, no unread messages
    expect(counts[channelId]).toBeUndefined();
  });

  test("message from another user creates unread count", async () => {
    // User2 sends a message
    await client2.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `unread-msg-${testId()}` },
    });

    // User1 should see 1 unread
    const res = await client1.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const counts = (await res.json()) as Record<string, number>;
    expect(counts[channelId]).toBeGreaterThanOrEqual(1);
  });

  test("mark-as-read clears the count", async () => {
    // Mark channel as read for user1
    const markRes = await client1.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });
    expect(markRes.status).toBe(200);

    // User1 should now have 0 unreads
    const res = await client1.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    const counts = (await res.json()) as Record<string, number>;
    expect(counts[channelId]).toBeUndefined();
  });

  test("thread replies don't affect unread count", async () => {
    // Mark as read first
    await client1.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });

    // User2 sends a parent message
    const msgRes = await client2.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `thread-parent-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    // Mark as read again (consume the parent message)
    await client1.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });

    // User2 sends a thread reply
    await client2.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: msg.id },
      json: { content: `thread-reply-${testId()}` },
    });

    // User1 should still have 0 unreads (thread replies don't count)
    const res = await client1.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    const counts = (await res.json()) as Record<string, number>;
    expect(counts[channelId]).toBeUndefined();
  });

  test("multiple messages increment count correctly", async () => {
    // Mark as read first
    await client1.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });

    // User2 sends 3 messages
    for (let i = 0; i < 3; i++) {
      await client2.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: channelId },
        json: { content: `multi-msg-${i}-${testId()}` },
      });
    }

    // User1 should see 3 unreads
    const res = await client1.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    const counts = (await res.json()) as Record<string, number>;
    expect(counts[channelId]).toBe(3);
  });
});
