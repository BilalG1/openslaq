import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  cleanupTestWorkspaces,
  testId,
} from "../helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("messages command (integration)", () => {
  let client: Client;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-msg-${testId()}`,
      displayName: "CLI Messages User",
      email: `cli-msg-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Get #general channel
    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string; name: string }[];
    const general = channels.find((c) => c.name === "general");
    if (!general) throw new Error("No #general channel found");
    channelId = general.id;
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("send a message and read it back", async () => {
    const content = `CLI test message ${testId()}`;

    const sendRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(sendRes.status).toBe(201);

    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: { limit: 10 },
    });
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as {
      messages: { content: string }[];
    };
    const found = data.messages.some((m) => m.content === content);
    expect(found).toBe(true);
  });

  test("edit a message", async () => {
    const original = `CLI edit original ${testId()}`;
    const updated = `CLI edit updated ${testId()}`;

    const sendRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: original },
    });
    expect(sendRes.status).toBe(201);
    const msg = (await sendRes.json()) as { id: string };

    const editRes = await client.api.messages[":id"].$put({
      param: { id: msg.id },
      json: { content: updated },
    });
    expect(editRes.status).toBe(200);
    const edited = (await editRes.json()) as { content: string };
    expect(edited.content).toBe(updated);
  });

  test("delete a message", async () => {
    const content = `CLI delete me ${testId()}`;

    const sendRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(sendRes.status).toBe(201);
    const msg = (await sendRes.json()) as { id: string };

    const deleteRes = await client.api.messages[":id"].$delete({
      param: { id: msg.id },
    });
    expect(deleteRes.status).toBe(200);
    const body = (await deleteRes.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("reply to a message and list thread", async () => {
    const parentContent = `CLI thread parent ${testId()}`;
    const replyContent = `CLI thread reply ${testId()}`;

    // Send parent message
    const sendRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: parentContent },
    });
    expect(sendRes.status).toBe(201);
    const parent = (await sendRes.json()) as { id: string };

    // Reply to thread
    const replyRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parent.id },
      json: { content: replyContent },
    });
    expect(replyRes.status).toBe(201);
    const reply = (await replyRes.json()) as { id: string; content: string };
    expect(reply.content).toBe(replyContent);

    // List thread replies
    const threadRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get({
      param: { slug, id: channelId, messageId: parent.id },
      query: { limit: 50 },
    });
    expect(threadRes.status).toBe(200);
    const data = (await threadRes.json()) as { messages: { content: string }[] };
    const found = data.messages.some((m) => m.content === replyContent);
    expect(found).toBe(true);
  });

  test("toggle a reaction on a message", async () => {
    const content = `CLI react target ${testId()}`;

    const sendRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(sendRes.status).toBe(201);
    const msg = (await sendRes.json()) as { id: string };

    // Add reaction
    const reactRes = await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "👍" },
    });
    expect(reactRes.status).toBe(200);
    const data = (await reactRes.json()) as { reactions: { emoji: string; count: number }[] };
    const thumbs = data.reactions.find((r) => r.emoji === "👍");
    expect(thumbs).toBeDefined();
    expect(thumbs!.count).toBe(1);

    // Toggle off
    const removeRes = await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "👍" },
    });
    expect(removeRes.status).toBe(200);
    const removed = (await removeRes.json()) as { reactions: { emoji: string }[] };
    const thumbsAfter = removed.reactions.find((r) => r.emoji === "👍");
    expect(thumbsAfter).toBeUndefined();
  });

  test("list messages from empty channel returns empty array", async () => {
    // Create a new channel to ensure it's empty
    const name = `cli-empty-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    expect(createRes.status).toBe(201);
    const channel = (await createRes.json()) as { id: string };

    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channel.id },
      query: { limit: 10 },
    });
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as { messages: unknown[] };
    expect(data.messages).toHaveLength(0);
  });
});
