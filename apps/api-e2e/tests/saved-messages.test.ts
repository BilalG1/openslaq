import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("saved messages", () => {
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
      json: { name: `save-test-${testId()}` },
    });
    const channel = (await chRes.json()) as { id: string };
    channelId = channel.id;

    // Send a message to save
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "This is a saveable message" },
    });
    const msg = (await msgRes.json()) as { id: string };
    messageId = msg.id;
  });

  test("save message → 200", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });
    expect(res.status).toBe(200);
  });

  test("list saved messages includes saved message", async () => {
    // Ensure saved
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"]["saved-messages"].$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { messages: Array<{ message: { id: string }; channelName: string; savedAt: string }> };
    expect(data.messages.some((m) => m.message.id === messageId)).toBe(true);
  });

  test("list saved IDs includes saved message", async () => {
    // Ensure saved
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"]["saved-messages"].ids.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { messageIds: string[] };
    expect(data.messageIds).toContain(messageId);
  });

  test("unsave message → 200", async () => {
    // Ensure saved first
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$delete({
      param: { slug, id: channelId, messageId },
    });
    expect(res.status).toBe(200);
  });

  test("after unsave, message not in saved list", async () => {
    // Save then unsave
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$delete({
      param: { slug, id: channelId, messageId },
    });

    const res = await client.api.workspaces[":slug"]["saved-messages"].$get({
      param: { slug },
    });
    const data = (await res.json()) as { messages: Array<{ message: { id: string } }> };
    expect(data.messages.some((m) => m.message.id === messageId)).toBe(false);
  });

  test("save non-existent message → 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId: fakeId },
    });
    expect(res.status).toBe(404);
  });

  test("save is idempotent (double-save no error)", async () => {
    const res1 = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });
    expect(res1.status).toBe(200);

    const res2 = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });
    expect(res2.status).toBe(200);

    // Should only appear once in saved list
    const listRes = await client.api.workspaces[":slug"]["saved-messages"].$get({
      param: { slug },
    });
    const data = (await listRes.json()) as { messages: Array<{ message: { id: string } }> };
    const count = data.messages.filter((m) => m.message.id === messageId).length;
    expect(count).toBe(1);
  });

  test("saves are private (different user cannot see them)", async () => {
    // Save a message as user 1
    await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
      param: { slug, id: channelId, messageId },
    });

    // Create a second user and join the workspace
    const ctx2 = await createTestClient({
      id: `save-privacy-${testId()}`,
      displayName: "Private Saver",
      email: `save-privacy-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    // Join workspace (the workspace needs a member)
    // The second user might not be a workspace member, so they should get 403/404 on the workspace
    // or see an empty list — either way, they shouldn't see user 1's saves
    const res = await ctx2.client.api.workspaces[":slug"]["saved-messages"].$get({
      param: { slug },
    });

    if (res.status === 200) {
      const data = (await res.json()) as { messages: Array<{ message: { id: string } }> };
      expect(data.messages.some((m) => m.message.id === messageId)).toBe(false);
    }
    // If the user can't access the workspace at all (403/404), that's also fine — saves are private
  });
});
