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
});
