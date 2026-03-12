import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  cleanupTestWorkspaces,
  testId,
} from "../helpers/api-client";
import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("presence command (integration)", () => {
  let client: Client;
  let slug: string;
  const userId = `cli-presence-${testId()}`;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: userId,
      displayName: "Presence Test User",
      email: `${userId}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("GET /presence returns 200 with array", async () => {
    const res = await client.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test("presence entries have expected shape", async () => {
    const res = await client.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const entries = (await res.json()) as { userId: string; online: boolean }[];
    // May be empty since test user isn't connected via Socket.IO
    for (const entry of entries) {
      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("online");
    }
  });
});
