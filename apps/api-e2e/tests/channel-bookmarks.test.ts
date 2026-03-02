import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, getBaseUrl, testId } from "./helpers/api-client";

describe("channel bookmarks", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let headers: Record<string, string>;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    headers = ctx.headers;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a channel
    const chRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `bookmark-test-${testId()}` },
    });
    const channel = (await chRes.json()) as { id: string };
    channelId = channel.id;
  });

  test("list bookmarks on empty channel → 200 with empty array", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$get({
      param: { slug, id: channelId },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { bookmarks: unknown[] };
    expect(data.bookmarks).toEqual([]);
  });

  test("add bookmark → 201", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$post({
      param: { slug, id: channelId },
      json: { url: "https://example.com", title: "Example" },
    });
    expect(res.status).toBe(201);
    const bookmark = (await res.json()) as { id: string; url: string; title: string; channelId: string };
    expect(bookmark.url).toBe("https://example.com");
    expect(bookmark.title).toBe("Example");
    expect(bookmark.channelId).toBe(channelId);
  });

  test("list bookmarks returns added bookmarks in order", async () => {
    // Add two more bookmarks
    await client.api.workspaces[":slug"].channels[":id"].bookmarks.$post({
      param: { slug, id: channelId },
      json: { url: "https://first.com", title: "First" },
    });
    await client.api.workspaces[":slug"].channels[":id"].bookmarks.$post({
      param: { slug, id: channelId },
      json: { url: "https://second.com", title: "Second" },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$get({
      param: { slug, id: channelId },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { bookmarks: Array<{ url: string; title: string }> };
    expect(data.bookmarks.length).toBeGreaterThanOrEqual(2);
    // Last two should be in order
    const urls = data.bookmarks.map((b) => b.url);
    const firstIdx = urls.indexOf("https://first.com");
    const secondIdx = urls.indexOf("https://second.com");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  test("remove bookmark → 200", async () => {
    // Add a bookmark to remove
    const addRes = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$post({
      param: { slug, id: channelId },
      json: { url: "https://to-remove.com", title: "Remove Me" },
    });
    expect(addRes.status).toBe(201);
    const bookmark = (await addRes.json()) as { id: string };

    // Remove via raw fetch (since Hono client doesn't support nested dynamic params easily)
    const delRes = await fetch(
      `${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/bookmarks/${bookmark.id}`,
      { method: "DELETE", headers },
    );
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const listRes = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$get({
      param: { slug, id: channelId },
    });
    const data = (await listRes.json()) as { bookmarks: Array<{ id: string }> };
    expect(data.bookmarks.some((b) => b.id === bookmark.id)).toBe(false);
  });

  test("remove non-existent bookmark → 404", async () => {
    const delRes = await fetch(
      `${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/bookmarks/00000000-0000-0000-0000-000000000000`,
      { method: "DELETE", headers },
    );
    expect(delRes.status).toBe(404);
  });

  test("add bookmark to archived channel → 400", async () => {
    // Create and archive a channel
    const chRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `archived-bm-${testId()}` },
    });
    const ch = (await chRes.json()) as { id: string };

    await client.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: ch.id },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$post({
      param: { slug, id: ch.id },
      json: { url: "https://example.com", title: "Nope" },
    });
    expect(res.status).toBe(400);
  });

  test("add bookmark with invalid URL → 400", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].bookmarks.$post({
      param: { slug, id: channelId },
      json: { url: "not-a-url", title: "Bad URL" },
    });
    expect(res.status).toBe(400);
  });
});
