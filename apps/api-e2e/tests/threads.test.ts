import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

describe("threads", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let headers: Record<string, string>;
  let slug: string;
  let channelId: string;
  let parentMessageId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    headers = ctx.headers;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a dedicated test channel
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `thread-test-${testId()}`, description: "thread tests" },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;

    // Create a parent message
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `parent-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };
    parentMessageId = msg.id;
  });

  test("create thread reply → 201", async () => {
    const content = `reply-${testId()}`;
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parentMessageId },
      json: { content },
    });
    expect(res.status).toBe(201);
    const reply = (await res.json()) as { id: string; content: string; parentMessageId: string };
    expect(reply.content).toBe(content);
    expect(reply.parentMessageId).toBe(parentMessageId);
  });

  test("list thread replies", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get({
      param: { slug, id: channelId, messageId: parentMessageId },
      query: {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { id: string; parentMessageId: string }[] };
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBeGreaterThanOrEqual(1);
    // All replies should reference the parent
    for (const reply of body.messages) {
      expect(reply.parentMessageId).toBe(parentMessageId);
    }
  });

  test("parent replyCount updates after replies", async () => {
    // Create a fresh parent for counting
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `count-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 2 replies
    for (let i = 0; i < 2; i++) {
      await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `count-reply-${i}-${testId()}` },
      });
    }

    // Check parent's replyCount in channel message list
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string; replyCount: number }[] };
    const found = body.messages.find((m) => m.id === parent.id);
    expect(found).toBeDefined();
    expect(found!.replyCount).toBe(2);
  });

  test("thread replies excluded from channel message list", async () => {
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string; parentMessageId: string | null }[] };
    // No message in the list should have a parentMessageId
    for (const msg of body.messages) {
      expect(msg.parentMessageId).toBeNull();
    }
  });

  test("reply to a reply → 400", async () => {
    // Create a reply
    const replyRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parentMessageId },
      json: { content: `nested-reply-${testId()}` },
    });
    expect(replyRes.status).toBe(201);
    const reply = (await replyRes.json()) as { id: string };

    // Try to reply to the reply
    const nestedRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: reply.id },
      json: { content: `should-fail-${testId()}` },
    });
    expect(nestedRes.status).toBe(400);
  });

  test("delete reply decrements parent replyCount", async () => {
    // Create a fresh parent
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `del-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 2 replies
    const replyIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const rRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `del-reply-${i}-${testId()}` },
      });
      const r = (await rRes.json()) as { id: string };
      replyIds.push(r.id);
    }

    // Delete one reply
    const delRes = await client.api.messages[":id"].$delete({
      param: { id: replyIds[0]! },
    });
    expect(delRes.status).toBe(200);

    // Check parent's replyCount
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string; replyCount: number }[] };
    const found = body.messages.find((m) => m.id === parent.id);
    expect(found).toBeDefined();
    expect(found!.replyCount).toBe(1);
  });

  test("get single message by ID", async () => {
    const res = await client.api.messages[":id"].$get({
      param: { id: parentMessageId },
    });
    expect(res.status).toBe(200);
    const msg = (await res.json()) as { id: string; content: string; replyCount: number };
    expect(msg.id).toBe(parentMessageId);
    expect(msg.replyCount).toBeGreaterThanOrEqual(1);
  });

  test("thread reply pagination with cursor (default direction=older returns newest first)", async () => {
    // Create a fresh parent
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `page-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 3 replies with small delays to ensure distinct timestamps
    const replyIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 50));
      const rRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `page-reply-${i}-${testId()}` },
      });
      const r = (await rRes.json()) as { id: string };
      replyIds.push(r.id);
    }

    // Fetch first page with limit=1 — default direction=older returns newest first
    const repliesUrl = `${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages/${parent.id}/replies`;
    const page1Res = await fetch(`${repliesUrl}?limit=1`, { headers });
    expect(page1Res.status).toBe(200);
    const page1 = (await page1Res.json()) as { messages: { id: string }[]; nextCursor: string | null };
    expect(page1.messages).toHaveLength(1);
    // First result should be the newest reply (reply-2)
    expect(page1.messages[0]!.id).toBe(replyIds[2]!);
    expect(page1.nextCursor).not.toBeNull();

    // Fetch second page using cursor — should get next oldest
    const page2Res = await fetch(`${repliesUrl}?limit=1&cursor=${page1.nextCursor}`, { headers });
    expect(page2Res.status).toBe(200);
    const page2 = (await page2Res.json()) as { messages: { id: string }[]; nextCursor: string | null };
    expect(page2.messages).toHaveLength(1);
    expect(page2.messages[0]!.id).toBe(replyIds[1]!);
  });

  test("thread replies with direction=newer returns oldest first", async () => {
    // Create a fresh parent
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `newer-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 3 replies with small delays
    const replyIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 50));
      const rRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `newer-reply-${i}-${testId()}` },
      });
      const r = (await rRes.json()) as { id: string };
      replyIds.push(r.id);
    }

    // Fetch with direction=newer — should return oldest first
    const repliesUrl = `${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages/${parent.id}/replies`;
    const res = await fetch(`${repliesUrl}?direction=newer&limit=2`, { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { id: string }[]; nextCursor: string | null };
    expect(body.messages).toHaveLength(2);
    // direction=newer returns ASC order: oldest first
    expect(body.messages[0]!.id).toBe(replyIds[0]!);
    expect(body.messages[1]!.id).toBe(replyIds[1]!);
    expect(body.nextCursor).not.toBeNull();
  });

  test("thread replies are scoped to requested channel", async () => {
    const otherChannelRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `thread-other-${testId()}` },
    });
    expect(otherChannelRes.status).toBe(201);
    const otherChannel = (await otherChannelRes.json()) as { id: string };

    const otherParentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: otherChannel.id },
      json: { content: `other-parent-${testId()}` },
    });
    expect(otherParentRes.status).toBe(201);
    const otherParent = (await otherParentRes.json()) as { id: string };

    const otherReplyRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: otherChannel.id, messageId: otherParent.id },
      json: { content: `other-reply-${testId()}` },
    });
    expect(otherReplyRes.status).toBe(201);

    // Mismatched route: request replies for parent from otherChannel via channelId
    const leakAttemptRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get({
      param: { slug, id: channelId, messageId: otherParent.id },
      query: {},
    });
    expect(leakAttemptRes.status).toBe(200);
    const leakAttempt = (await leakAttemptRes.json()) as { messages: { id: string }[]; nextCursor: string | null };
    expect(leakAttempt.messages).toHaveLength(0);
    expect(leakAttempt.nextCursor).toBeNull();
  });

  test("delete parent message — replies become orphaned", async () => {
    // Create a fresh parent
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `orphan-parent-${testId()}` },
    });
    expect(parentRes.status).toBe(201);
    const parent = (await parentRes.json()) as { id: string };

    // Create 2 replies
    const replyIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const rRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `orphan-reply-${i}-${testId()}` },
      });
      expect(rRes.status).toBe(201);
      const r = (await rRes.json()) as { id: string };
      replyIds.push(r.id);
    }

    // Delete the parent
    const delRes = await client.api.messages[":id"].$delete({
      param: { id: parent.id },
    });
    expect(delRes.status).toBe(200);

    // Parent should be gone from channel messages
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string }[] };
    expect(body.messages.find((m) => m.id === parent.id)).toBeUndefined();

    // Replies are orphaned — they still exist in DB but are not accessible
    // via GET /api/messages/:id (because parentMessageId references deleted message,
    // but the reply itself is still channel-member accessible)
    // The replies still exist and are accessible since channel membership is intact
    const reply1Res = await client.api.messages[":id"].$get({
      param: { id: replyIds[0]! },
    });
    // Replies are still accessible (orphaned but not deleted — no cascade)
    expect(reply1Res.status).toBe(200);
    const reply1 = (await reply1Res.json()) as { id: string; parentMessageId: string };
    expect(reply1.parentMessageId).toBe(parent.id);

    // But the parent reference now points to a deleted message
    const parentRes2 = await client.api.messages[":id"].$get({
      param: { id: parent.id },
    });
    expect(parentRes2.status).toBe(404);
  });

  test("get nonexistent message → 404", async () => {
    const res = await client.api.messages[":id"].$get({
      param: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });

  describe("GET /threads (user threads list)", () => {
    test("returns threads the user is participating in", async () => {
      // The beforeAll already created a parent + reply, so this user has at least one thread
      const res = await client.api.workspaces[":slug"].threads.$get({
        param: { slug },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { threads: Array<{ message: { id: string; replyCount: number }; channelName: string }> };
      expect(Array.isArray(body.threads)).toBe(true);
      expect(body.threads.length).toBeGreaterThanOrEqual(1);

      // Each thread should have a message with replyCount > 0 and a channelName
      for (const thread of body.threads) {
        expect(thread.message.replyCount).toBeGreaterThanOrEqual(1);
        expect(typeof thread.channelName).toBe("string");
        expect(thread.channelName.length).toBeGreaterThan(0);
      }
    });

    test("includes thread where user authored the parent", async () => {
      // Create a fresh parent + reply from same user
      const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: channelId },
        json: { content: `user-thread-parent-${testId()}` },
      });
      const parent = (await parentRes.json()) as { id: string };

      await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `user-thread-reply-${testId()}` },
      });

      const res = await client.api.workspaces[":slug"].threads.$get({
        param: { slug },
      });
      const body = (await res.json()) as { threads: Array<{ message: { id: string } }> };
      const found = body.threads.find((t) => t.message.id === parent.id);
      expect(found).toBeDefined();
    });

    test("returns empty array when user has no threads", async () => {
      // Create a new workspace with no messages
      const emptyWs = await createTestWorkspace(client);
      const res = await client.api.workspaces[":slug"].threads.$get({
        param: { slug: emptyWs.slug },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { threads: unknown[] };
      expect(body.threads).toHaveLength(0);
    });
  });
});
