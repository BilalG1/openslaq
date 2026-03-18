import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  addToWorkspace,
  testId,
} from "./helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("direct messages", () => {
  let client: Client;
  let slug: string;
  const user1Id = "api-e2e-dm-user-001";

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: user1Id,
      displayName: "DM User 1",
      email: `dm-001-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  test("create self-DM → 200 (auto-created during workspace setup)", async () => {
    // Self-DM is auto-created when workspace is created, so this returns 200
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user1Id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      channel: { id: string; type: string; name: string };
      otherUser: { id: string };
    };
    expect(body.channel.type).toBe("dm");
    expect(body.otherUser.id).toBe(user1Id);
  });

  test("get existing self-DM → 200 (idempotent)", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user1Id },
    });
    expect(res.status).toBe(200);
  });

  test("target not a workspace member → 400", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: "nonexistent-user-id" },
    });
    expect(res.status).toBe(400);
  });

  test("list DMs — returns created self-DM", async () => {
    const res = await client.api.workspaces[":slug"].dm.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    }[];
    expect(dms.length).toBeGreaterThanOrEqual(1);
    const selfDm = dms.find((d) => d.otherUser.id === user1Id);
    expect(selfDm).toBeDefined();
    expect(selfDm!.channel.type).toBe("dm");
  });

  test("list DMs on fresh workspace → includes auto-created self-DM", async () => {
    const { client: freshClient } = await createTestClient({
      id: `dm-fresh-${testId()}`,
      displayName: "Fresh User",
      email: `dm-fresh-${testId()}@openslaq.dev`,
    });
    const freshWs = await createTestWorkspace(freshClient);
    const res = await freshClient.api.workspaces[":slug"].dm.$get({
      param: { slug: freshWs.slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as { channel: { type: string }; otherUser: { id: string } }[];
    // Workspace creation auto-creates a self-DM
    expect(dms.length).toBe(1);
    expect(dms[0]!.channel.type).toBe("dm");
  });

  test("send message in DM channel → 201 (reuses message routes)", async () => {
    const dmRes = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user1Id },
    });
    const { channel } = (await dmRes.json()) as {
      channel: { id: string };
    };

    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel.id },
      json: { content: `dm-msg-${testId()}` },
    });
    expect(msgRes.status).toBe(201);
  });

  test("DMs excluded from GET /channels response", async () => {
    const res = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { type: string }[];
    for (const ch of channels) {
      expect(ch.type).toBe("public");
    }
  });
});

describe("direct messages — cross-user", () => {
  let client: Client;
  let slug: string;
  const user1Id = `dm-cross-001-${testId()}`;
  const user2Id = `dm-cross-002-${testId()}`;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: user1Id,
      displayName: "Cross DM User 1",
      email: `cross-dm-001-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // User2 gets upserted as a user (but NOT added to user1's workspace)
    await createTestClient({
      id: user2Id,
      displayName: "Cross DM User 2",
      email: `cross-dm-002-${testId()}@openslaq.dev`,
    });
  });

  test("DM with non-workspace-member → 400", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user2Id },
    });
    expect(res.status).toBe(400);
  });
});

describe("direct messages — privacy", () => {
  let clientA: Client;
  let clientB: Client;
  let clientC: Client;
  let slug: string;
  let dmChannelId: string;
  let dmMessageId: string;

  beforeAll(async () => {
    const uid = testId();

    // User A: workspace owner
    const ctxA = await createTestClient({
      id: `dm-priv-a-${uid}`,
      displayName: "DM Privacy A",
      email: `dm-priv-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    // User B: workspace member, DM participant
    const ctxB = await createTestClient({
      id: `dm-priv-b-${uid}`,
      displayName: "DM Privacy B",
      email: `dm-priv-b-${uid}@openslaq.dev`,
    });
    clientB = ctxB.client;
    await addToWorkspace(clientA, slug, clientB);

    // User C: workspace member, NOT in the DM
    const ctxC = await createTestClient({
      id: `dm-priv-c-${uid}`,
      displayName: "DM Privacy C",
      email: `dm-priv-c-${uid}@openslaq.dev`,
    });
    clientC = ctxC.client;
    await addToWorkspace(clientA, slug, clientC);

    // A creates DM with B
    const dmRes = await clientA.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: ctxB.user.id },
    });
    expect(dmRes.status).toBe(201);
    const dm = (await dmRes.json()) as { channel: { id: string } };
    dmChannelId = dm.channel.id;

    // A sends a message in the DM
    const msgRes = await clientA.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: dmChannelId },
      json: { content: `dm-secret-${uid}` },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };
    dmMessageId = msg.id;
  });

  test("non-participant cannot read DM messages → 403", async () => {
    const res = await clientC.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: dmChannelId },
      query: {},
    });
    expect(res.status as number).toBe(403);
  });

  test("non-participant cannot send message to DM → 403", async () => {
    const res = await clientC.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: dmChannelId },
      json: { content: "intruder" },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-participant cannot GET DM message by ID → 404", async () => {
    const res = await clientC.api.messages[":id"].$get({
      param: { id: dmMessageId },
    });
    expect(res.status).toBe(404);
  });

  test("DM participant CAN read messages", async () => {
    const res = await clientB.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: dmChannelId },
      query: {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { id: string }[] };
    expect(body.messages.some((m) => m.id === dmMessageId)).toBe(true);
  });

  test("DM participant CAN GET message by ID", async () => {
    const res = await clientB.api.messages[":id"].$get({
      param: { id: dmMessageId },
    });
    expect(res.status).toBe(200);
  });
});

describe("direct messages — self-DM messaging", () => {
  let client: Client;
  let slug: string;
  const userId = `dm-self-msg-${testId()}`;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: userId,
      displayName: "Self DM Msg",
      email: `dm-self-msg-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  test("self-DM: send and list messages", async () => {
    // Create self-DM
    const dmRes = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId },
    });
    const dm = (await dmRes.json()) as { channel: { id: string } };
    const channelId = dm.channel.id;

    // Send a message
    const content = `self-dm-msg-${testId()}`;
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(msgRes.status).toBe(201);

    // List messages
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as { messages: { content: string }[] };
    expect(body.messages.some((m) => m.content === content)).toBe(true);
  });

  test("self-DM: channel members list has only one entry", async () => {
    const dmRes = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId },
    });
    const dm = (await dmRes.json()) as { channel: { id: string } };

    const membersRes = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: dm.channel.id },
    });
    expect(membersRes.status).toBe(200);
    const members = (await membersRes.json()) as { id: string }[];
    expect(members.length).toBe(1);
    expect(members[0]!.id).toBe(userId);
  });
});

describe("direct messages — cross-user (workspace members)", () => {
  let client1: Client;
  let client2: Client;
  let slug: string;
  const u1Id = `dm-xm-001-${testId()}`;
  const u2Id = `dm-xm-002-${testId()}`;

  beforeAll(async () => {
    const ctx1 = await createTestClient({
      id: u1Id,
      displayName: "XM DM User 1",
      email: `xm-dm-001-${testId()}@openslaq.dev`,
    });
    client1 = ctx1.client;
    const workspace = await createTestWorkspace(client1);
    slug = workspace.slug;

    const ctx2 = await createTestClient({
      id: u2Id,
      displayName: "XM DM User 2",
      email: `xm-dm-002-${testId()}@openslaq.dev`,
    });
    client2 = ctx2.client;
    await addToWorkspace(client1, slug, client2);
  });

  test("create DM between two workspace members → 201", async () => {
    const res = await client1.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: u2Id },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    };
    expect(body.channel.type).toBe("dm");
    expect(body.otherUser.id).toBe(u2Id);
  });

  test("list DMs includes cross-user DM", async () => {
    const res = await client1.api.workspaces[":slug"].dm.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    }[];
    expect(dms.length).toBeGreaterThanOrEqual(1);
    const crossDm = dms.find((d) => d.otherUser.id === u2Id);
    expect(crossDm).toBeDefined();
    expect(crossDm!.channel.type).toBe("dm");
  });

  test("other user also sees the DM in their list", async () => {
    const res = await client2.api.workspaces[":slug"].dm.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    }[];
    const crossDm = dms.find((d) => d.otherUser.id === u1Id);
    expect(crossDm).toBeDefined();
  });
});
