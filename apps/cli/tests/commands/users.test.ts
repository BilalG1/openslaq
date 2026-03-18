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

describe("users command (integration)", () => {
  let client: Client;
  let slug: string;
  const displayName = "CLI Users Test User";

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-users-${testId()}`,
      displayName,
      email: `cli-users-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("list members returns the test user", async () => {
    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { displayName: string; email: string; role: string }[];
    expect(members.length).toBeGreaterThan(0);
    const found = members.find((m) => m.displayName === displayName);
    expect(found).toBeDefined();
    expect(found!.role).toBe("owner");
  });

  test("search members by display name returns matching results", async () => {
    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
      query: { q: "CLI Users" },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { displayName: string }[];
    expect(members.length).toBeGreaterThan(0);
    const found = members.find((m) => m.displayName === displayName);
    expect(found).toBeDefined();
  });

  test("search with no match returns empty", async () => {
    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
      query: { q: `nonexistent-${testId()}` },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { displayName: string }[];
    expect(members).toHaveLength(0);
  });

  test("update-profile changes display name", async () => {
    const newName = `Updated-${testId()}`;
    const res = await client.api.users.me.$patch({
      json: { displayName: newName },
    });
    expect(res.status).toBe(200);
    const user = (await res.json()) as { displayName: string };
    expect(user.displayName).toBe(newName);
  });

  test("update-profile with avatar URL", async () => {
    const res = await client.api.users.me.$patch({
      json: { avatarUrl: "https://example.com/avatar.png" },
    });
    expect(res.status).toBe(200);
    const user = (await res.json()) as { avatarUrl: string | null };
    expect(user.avatarUrl).toBe("https://example.com/avatar.png");
  });
});
