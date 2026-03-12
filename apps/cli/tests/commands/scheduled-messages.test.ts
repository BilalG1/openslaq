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

describe("scheduled messages (integration)", () => {
  let client: Client;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-sched-${testId()}`,
      displayName: "CLI Scheduled User",
      email: `cli-sched-${testId()}@openslaq.dev`,
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

  test("schedule a message and list it", async () => {
    const content = `Scheduled test ${testId()}`;
    const scheduledFor = new Date(Date.now() + 3_600_000).toISOString();

    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: { channelId, content, scheduledFor },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; content: string; status: string };
    expect(created.content).toBe(content);
    expect(created.status).toBe("pending");

    // List scheduled messages
    const listRes = await client.api.workspaces[":slug"]["scheduled-messages"].$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as {
      scheduledMessages: { id: string; content: string }[];
    };
    const found = data.scheduledMessages.some((m) => m.id === created.id);
    expect(found).toBe(true);
  });

  test("scheduling for past time returns error", async () => {
    const pastTime = new Date(Date.now() - 60_000).toISOString();

    const res = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: { channelId, content: "Should fail", scheduledFor: pastTime },
    });
    expect(res.ok).toBe(false);
  });
});
