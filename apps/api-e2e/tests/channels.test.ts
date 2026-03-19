import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import { setIO } from "../../api/src/socket/io";

type EmittedEvent = {
  room: string;
  event: string;
  payload: unknown;
};

function createIoCapture() {
  const events: EmittedEvent[] = [];

  setIO({
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          events.push({ room, event, payload });
          return true;
        },
      };
    },
    sockets: {
      sockets: new Map(),
    },
  } as never);

  return events;
}

function resetIoStub() {
  setIO({
    to() {
      return {
        emit() {
          return true;
        },
      };
    },
    sockets: {
      sockets: new Map(),
    },
  } as never);
}

describe("channels", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let workspaceId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
    workspaceId = workspace.id;
  });

  afterEach(() => {
    resetIoStub();
  });

  test("fresh workspace has #general auto-created", async () => {
    const res = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { id: string; name: string }[];
    expect(Array.isArray(channels)).toBe(true);
    expect(channels.length).toBe(1);
    expect(channels[0]!.name).toBe("general");
  });

  test("create channel", async () => {
    const name = `test-${testId()}`;
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, description: "e2e test channel" },
    });
    expect(res.status).toBe(201);
    const channel = (await res.json()) as { id: string; name: string; memberCount?: number };
    expect(channel.name).toBe(name);
    expect(channel.id).toBeDefined();
    expect(channel.memberCount).toBe(1);
  });

  test("create channel emits channel:created to the workspace room", async () => {
    const events = createIoCapture();
    const name = `emit-${testId()}`;

    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, description: "emit test channel" },
    });

    expect(res.status).toBe(201);
    const channel = (await res.json()) as { id: string; name: string };
    expect(
      events.some(
        (entry) =>
          entry.room === `workspace:${workspaceId}` &&
          entry.event === "channel:created" &&
          (entry.payload as { channel: { id: string; name: string } }).channel.id === channel.id &&
          (entry.payload as { channel: { id: string; name: string } }).channel.name === name,
      ),
    ).toBe(true);
  });

  test("join channel — second user joins channel they didn't create", async () => {
    // Create a channel as the default user (who auto-joins)
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `join-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    // A different user joins the workspace, then the channel
    const { client: client2 } = await createTestClient({
      id: "api-e2e-user-002",
      displayName: "Second E2E User",
      email: "api-e2e-002@openslaq.dev",
    });
    await addToWorkspace(client, slug, client2);
    const res = await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("leave channel", async () => {
    // Create a channel first (creator auto-joins)
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `leave-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].channels[":id"].leave.$post({
      param: { slug, id: channel.id },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("duplicate channel name in same workspace → error", async () => {
    const name = `dup-chan-${testId()}`;
    const firstRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name },
    });
    expect(firstRes.status).toBe(201);

    const secondRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name },
    });
    expect(secondRes.status).toBeGreaterThanOrEqual(400);

    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const channels = (await listRes.json()) as { name: string }[];
    const duplicates = channels.filter((ch) => ch.name === name);
    expect(duplicates.length).toBe(1);
  });

  test("list channels returns created channels", async () => {
    // Use a fresh workspace (which already has #general)
    const freshWs = await createTestWorkspace(client);
    const name = `listed-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: freshWs.slug },
      json: { name },
    });
    expect(createRes.status).toBe(201);

    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug: freshWs.slug },
    });
    expect(listRes.status).toBe(200);
    const channels = (await listRes.json()) as { id: string; name: string }[];
    expect(channels.length).toBe(2);
    const created = channels.find((ch) => ch.name === name);
    expect(created).toBeDefined();
  });
});
