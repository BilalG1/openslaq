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

describe("channels command (integration)", () => {
  let client: Client;
  let slug: string;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-ch-${testId()}`,
      displayName: "CLI Channels User",
      email: `cli-ch-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("list channels returns default channels", async () => {
    const res = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { name: string; type: string }[];
    expect(channels.length).toBeGreaterThan(0);
    // New workspaces get #general by default
    const names = channels.map((c) => c.name);
    expect(names).toContain("general");
  });

  test("create and list a channel", async () => {
    const name = `cli-test-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    expect(createRes.status).toBe(201);

    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const channels = (await listRes.json()) as { name: string }[];
    const names = channels.map((c) => c.name);
    expect(names).toContain(name);
  });

  test("browse public channels", async () => {
    const name = `cli-browse-${testId()}`;
    await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });

    const res = await client.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { name: string; isMember: boolean }[];
    const found = channels.find((c) => c.name === name);
    expect(found).toBeDefined();
    expect(found!.isMember).toBe(true);
  });

  test("update channel description", async () => {
    const name = `cli-upd-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].channels[":id"].$patch({
      param: { slug, id: channel.id },
      json: { description: "Updated description" },
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { description: string | null };
    expect(updated.description).toBe("Updated description");
  });

  test("archive and unarchive a channel", async () => {
    const name = `cli-arch-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    const archRes = await client.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });
    expect(archRes.status).toBe(200);
    const archived = (await archRes.json()) as { isArchived: boolean };
    expect(archived.isArchived).toBe(true);

    const unarchRes = await client.api.workspaces[":slug"].channels[":id"].unarchive.$post({
      param: { slug, id: channel.id },
    });
    expect(unarchRes.status).toBe(200);
    const unarchived = (await unarchRes.json()) as { isArchived: boolean };
    expect(unarchived.isArchived).toBe(false);
  });

  test("star, list starred, and unstar a channel", async () => {
    const name = `cli-star-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Star
    const starRes = await client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channel.id },
    });
    expect(starRes.status).toBe(200);

    // List starred
    const starredRes = await client.api.workspaces[":slug"].channels.starred.$get({
      param: { slug },
    });
    expect(starredRes.status).toBe(200);
    const starred = (await starredRes.json()) as string[];
    expect(starred).toContain(channel.id);

    // Unstar
    const unstarRes = await client.api.workspaces[":slug"].channels[":id"].star.$delete({
      param: { slug, id: channel.id },
    });
    expect(unstarRes.status).toBe(200);

    // Verify unstarred
    const starredAfter = await client.api.workspaces[":slug"].channels.starred.$get({
      param: { slug },
    });
    const starredList = (await starredAfter.json()) as string[];
    expect(starredList).not.toContain(channel.id);
  });

  test("list channel members", async () => {
    const name = `cli-mem-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { displayName: string; email: string }[];
    expect(members.length).toBeGreaterThan(0);
  });

  test("add and remove member from private channel", async () => {
    const name = `cli-priv-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    expect(createRes.status).toBe(201);
    const channel = (await createRes.json()) as { id: string };

    // Create a second user and add them to the workspace via invite
    const secondId = `cli-mem2-${testId()}`;
    const { client: client2 } = await createTestClient({
      id: secondId,
      displayName: "Second User",
      email: `${secondId}@openslaq.dev`,
    });
    const inviteRes = await client.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: {},
    });
    expect(inviteRes.status).toBe(201);
    const invite = (await inviteRes.json()) as { code: string };
    const acceptRes = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(acceptRes.status).toBe(200);

    // Add member
    const addRes = await client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: secondId },
    });
    expect(addRes.status).toBe(201);

    // Verify member appears in list
    const listRes = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    const members = (await listRes.json()) as { displayName: string }[];
    const found = members.find((m) => m.displayName === "Second User");
    expect(found).toBeDefined();

    // Remove member
    const removeRes = await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug, id: channel.id, userId: secondId },
    });
    expect(removeRes.status).toBe(200);
  });

  test("get and set notification preference", async () => {
    const name = `cli-notif-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Get default pref
    const getRes = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
      param: { slug, id: channel.id },
    });
    expect(getRes.status).toBe(200);
    const pref = (await getRes.json()) as { level: string };
    expect(pref.level).toBe("all");

    // Set to muted
    const setRes = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channel.id },
      json: { level: "muted" },
    });
    expect(setRes.status).toBe(200);

    // Verify it changed
    const getRes2 = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
      param: { slug, id: channel.id },
    });
    const pref2 = (await getRes2.json()) as { level: string };
    expect(pref2.level).toBe("muted");
  });
});
