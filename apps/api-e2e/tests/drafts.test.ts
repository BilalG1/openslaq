import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId, addToWorkspace } from "./helpers/api-client";

describe("drafts", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;
  let parentMessageId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a test channel
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `draft-test-${testId()}`, description: "draft tests" },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;

    // Create a parent message for thread drafts
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `parent-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };
    parentMessageId = msg.id;
  });

  test("upsert draft → 200", async () => {
    const res = await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "hello draft" },
    });
    expect(res.status).toBe(200);
    const draft = (await res.json()) as { id: string; content: string; channelId: string; parentMessageId: string | null };
    expect(draft.content).toBe("hello draft");
    expect(draft.channelId).toBe(channelId);
    expect(draft.parentMessageId).toBeNull();
  });

  test("re-upsert updates, does not duplicate", async () => {
    // First upsert
    await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "version 1" },
    });

    // Second upsert
    const res = await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "version 2" },
    });
    expect(res.status).toBe(200);
    const draft = (await res.json()) as { content: string };
    expect(draft.content).toBe("version 2");

    // List should have exactly one draft for this channel
    const listRes = await client.api.workspaces[":slug"].drafts.$get({
      param: { slug },
    });
    const { drafts } = (await listRes.json()) as { drafts: { channelId: string; parentMessageId: string | null }[] };
    const channelDrafts = drafts.filter(
      (d) => d.channelId === channelId && d.parentMessageId === null,
    );
    expect(channelDrafts.length).toBe(1);
  });

  test("thread draft is separate from channel draft", async () => {
    // Upsert channel draft
    await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "channel draft" },
    });

    // Upsert thread draft
    const res = await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "thread draft", parentMessageId },
    });
    expect(res.status).toBe(200);
    const draft = (await res.json()) as { content: string; parentMessageId: string | null };
    expect(draft.content).toBe("thread draft");
    expect(draft.parentMessageId).toBe(parentMessageId);

    // List should have both
    const listRes = await client.api.workspaces[":slug"].drafts.$get({
      param: { slug },
    });
    const { drafts } = (await listRes.json()) as { drafts: { channelId: string; parentMessageId: string | null }[] };
    const channelDrafts = drafts.filter((d) => d.channelId === channelId);
    expect(channelDrafts.length).toBeGreaterThanOrEqual(2);
  });

  test("list drafts includes channel name", async () => {
    const res = await client.api.workspaces[":slug"].drafts.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const { drafts } = (await res.json()) as { drafts: { channelName: string }[] };
    expect(drafts.length).toBeGreaterThan(0);
    expect(typeof drafts[0]!.channelName).toBe("string");
    expect(drafts[0]!.channelName.length).toBeGreaterThan(0);
  });

  test("get draft for channel", async () => {
    const res = await client.api.workspaces[":slug"].drafts.channel[":channelId"].$get({
      param: { slug, channelId },
      query: {},
    });
    expect(res.status).toBe(200);
    const { draft } = (await res.json()) as { draft: { content: string } | null };
    expect(draft).not.toBeNull();
    expect(draft!.content).toBeTruthy();
  });

  test("get draft for thread", async () => {
    const res = await client.api.workspaces[":slug"].drafts.channel[":channelId"].$get({
      param: { slug, channelId },
      query: { parentMessageId },
    });
    expect(res.status).toBe(200);
    const { draft } = (await res.json()) as { draft: { content: string; parentMessageId: string } | null };
    expect(draft).not.toBeNull();
    expect(draft!.parentMessageId).toBe(parentMessageId);
  });

  test("delete by ID", async () => {
    // Create a draft to delete
    const createRes = await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "to delete" },
    });
    const created = (await createRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].drafts[":id"].$delete({
      param: { slug, id: created.id },
    });
    expect(res.status).toBe(200);

    // Should be gone
    const getRes = await client.api.workspaces[":slug"].drafts.channel[":channelId"].$get({
      param: { slug, channelId },
      query: {},
    });
    const { draft } = (await getRes.json()) as { draft: null };
    expect(draft).toBeNull();
  });

  test("delete by key", async () => {
    // Create a thread draft to delete by key
    await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "thread to delete by key", parentMessageId },
    });

    const res = await client.api.workspaces[":slug"].drafts["by-key"].$delete({
      param: { slug },
      query: { channelId, parentMessageId },
    });
    expect(res.status).toBe(200);

    // Should be gone
    const getRes = await client.api.workspaces[":slug"].drafts.channel[":channelId"].$get({
      param: { slug, channelId },
      query: { parentMessageId },
    });
    const { draft } = (await getRes.json()) as { draft: null };
    expect(draft).toBeNull();
  });

  test("delete non-existent draft → 404", async () => {
    const res = await client.api.workspaces[":slug"].drafts[":id"].$delete({
      param: { slug, id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });

  test("user scoping — can't see other user's drafts", async () => {
    // Create a draft as the default user
    await client.api.workspaces[":slug"].drafts.$put({
      param: { slug },
      json: { channelId, content: "user1 draft" },
    });

    // Create a second user
    const ctx2 = await createTestClient({
      id: `draft-scoping-user-${testId()}`,
      displayName: "Other User",
      email: `other-${testId()}@test.dev`,
    });
    await addToWorkspace(client, slug, ctx2.client);

    // Second user's draft list should not contain user1's drafts
    const res = await ctx2.client.api.workspaces[":slug"].drafts.$get({
      param: { slug },
    });
    const { drafts } = (await res.json()) as { drafts: { content: string }[] };
    const found = drafts.find((d) => d.content === "user1 draft");
    expect(found).toBeUndefined();
  });
});
