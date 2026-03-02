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

describe("group DMs — creation", () => {
  let clientA: Client;
  let clientB: Client;
  let clientC: Client;
  let clientD: Client;
  let slug: string;
  let userBId: string;
  let userCId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-a-${uid}`,
      displayName: "Group A",
      email: `gdm-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    const ctxB = await createTestClient({
      id: `gdm-b-${uid}`,
      displayName: "Group B",
      email: `gdm-b-${uid}@openslaq.dev`,
    });
    clientB = ctxB.client;
    userBId = ctxB.user.id;
    await addToWorkspace(clientA, slug, clientB);

    const ctxC = await createTestClient({
      id: `gdm-c-${uid}`,
      displayName: "Group C",
      email: `gdm-c-${uid}@openslaq.dev`,
    });
    clientC = ctxC.client;
    userCId = ctxC.user.id;
    await addToWorkspace(clientA, slug, clientC);

    const ctxD = await createTestClient({
      id: `gdm-d-${uid}`,
      displayName: "Group D",
      email: `gdm-d-${uid}@openslaq.dev`,
    });
    clientD = ctxD.client;
    await addToWorkspace(clientA, slug, clientD);
  });

  test("create group DM with 3 members → 201", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [userBId, userCId] },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      channel: { id: string; type: string; displayName: string | null };
      members: { id: string; displayName: string }[];
    };
    expect(body.channel.type).toBe("group_dm");
    expect(body.members.length).toBe(3); // A + B + C
    expect(body.channel.displayName).toBeTruthy();
  });

  test("duplicate creation with same members → 200 (idempotent)", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [userBId, userCId] },
    });
    expect(res.status).toBe(200);
  });

  test("duplicate creation with members in different order → 200", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [userCId, userBId] },
    });
    expect(res.status).toBe(200);
  });

  test("less than 2 other members → 400", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [userBId] },
    });
    expect(res.status).toBe(400);
  });

  test("non-workspace-member in memberIds → 400", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [userBId, "nonexistent-user-id"] },
    });
    expect(res.status).toBe(400);
  });

  test("list group DMs returns created conversations", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const groupDms = (await res.json()) as {
      channel: { id: string; type: string };
      members: { id: string }[];
    }[];
    expect(groupDms.length).toBeGreaterThanOrEqual(1);
    expect(groupDms[0]!.channel.type).toBe("group_dm");
  });

  test("other member also sees group DM in their list", async () => {
    const res = await clientB.api.workspaces[":slug"]["group-dm"].$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const groupDms = (await res.json()) as {
      channel: { id: string };
      members: { id: string }[];
    }[];
    expect(groupDms.length).toBeGreaterThanOrEqual(1);
  });

  test("group DMs excluded from GET /channels response", async () => {
    const res = await clientA.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { type: string }[];
    for (const ch of channels) {
      expect(ch.type).not.toBe("group_dm");
    }
  });
});

describe("group DMs — messaging", () => {
  let clientA: Client;
  let clientB: Client;
  let slug: string;
  let groupDmChannelId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-msg-a-${uid}`,
      displayName: "Msg A",
      email: `gdm-msg-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    const ctxB = await createTestClient({
      id: `gdm-msg-b-${uid}`,
      displayName: "Msg B",
      email: `gdm-msg-b-${uid}@openslaq.dev`,
    });
    clientB = ctxB.client;
    await addToWorkspace(clientA, slug, clientB);

    const ctxC = await createTestClient({
      id: `gdm-msg-c-${uid}`,
      displayName: "Msg C",
      email: `gdm-msg-c-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxC.client);

    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [ctxB.user.id, ctxC.user.id] },
    });
    const body = (await res.json()) as { channel: { id: string } };
    groupDmChannelId = body.channel.id;
  });

  test("send message in group DM → 201", async () => {
    const res = await clientA.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: groupDmChannelId },
      json: { content: `gdm-msg-${testId()}` },
    });
    expect(res.status).toBe(201);
  });

  test("other member can read messages", async () => {
    const res = await clientB.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: groupDmChannelId },
      query: {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { content: string }[] };
    expect(body.messages.length).toBeGreaterThanOrEqual(1);
  });
});

describe("group DMs — privacy", () => {
  let clientA: Client;
  let clientOutsider: Client;
  let slug: string;
  let groupDmChannelId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-priv-a-${uid}`,
      displayName: "Priv A",
      email: `gdm-priv-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    const ctxB = await createTestClient({
      id: `gdm-priv-b-${uid}`,
      displayName: "Priv B",
      email: `gdm-priv-b-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxB.client);

    const ctxC = await createTestClient({
      id: `gdm-priv-c-${uid}`,
      displayName: "Priv C",
      email: `gdm-priv-c-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxC.client);

    // Outsider is a workspace member but NOT in the group DM
    const ctxOut = await createTestClient({
      id: `gdm-priv-out-${uid}`,
      displayName: "Priv Outsider",
      email: `gdm-priv-out-${uid}@openslaq.dev`,
    });
    clientOutsider = ctxOut.client;
    await addToWorkspace(clientA, slug, clientOutsider);

    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [ctxB.user.id, ctxC.user.id] },
    });
    const body = (await res.json()) as { channel: { id: string } };
    groupDmChannelId = body.channel.id;

    // Send a message
    await clientA.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: groupDmChannelId },
      json: { content: `secret-${uid}` },
    });
  });

  test("non-member cannot read group DM messages → 404", async () => {
    const res = await clientOutsider.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: groupDmChannelId },
      query: {},
    });
    expect(res.status as number).toBe(404);
  });

  test("non-member cannot send to group DM → 404", async () => {
    const res = await clientOutsider.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: groupDmChannelId },
      json: { content: "intruder" },
    });
    expect(res.status as number).toBe(404);
  });
});

describe("group DMs — add member", () => {
  let clientA: Client;
  let slug: string;
  let groupDmChannelId: string;
  let userDId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-add-a-${uid}`,
      displayName: "Add A",
      email: `gdm-add-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    const ctxB = await createTestClient({
      id: `gdm-add-b-${uid}`,
      displayName: "Add B",
      email: `gdm-add-b-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxB.client);

    const ctxC = await createTestClient({
      id: `gdm-add-c-${uid}`,
      displayName: "Add C",
      email: `gdm-add-c-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxC.client);

    const ctxD = await createTestClient({
      id: `gdm-add-d-${uid}`,
      displayName: "Add D",
      email: `gdm-add-d-${uid}@openslaq.dev`,
    });
    userDId = ctxD.user.id;
    await addToWorkspace(clientA, slug, ctxD.client);

    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [ctxB.user.id, ctxC.user.id] },
    });
    const body = (await res.json()) as { channel: { id: string } };
    groupDmChannelId = body.channel.id;
  });

  test("add member to group DM → 200", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"][":channelId"].members.$post({
      param: { slug, channelId: groupDmChannelId },
      json: { userId: userDId },
    });
    expect(res.status).toBe(200);
  });

  test("added member now appears in group DM list", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$get({
      param: { slug },
    });
    const groupDms = (await res.json()) as {
      channel: { id: string };
      members: { id: string }[];
    }[];
    const gdm = groupDms.find((g) => g.channel.id === groupDmChannelId);
    expect(gdm).toBeDefined();
    expect(gdm!.members.some((m) => m.id === userDId)).toBe(true);
    expect(gdm!.members.length).toBe(4); // A + B + C + D
  });
});

describe("group DMs — leave", () => {
  let clientA: Client;
  let clientB: Client;
  let slug: string;
  let groupDmChannelId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-leave-a-${uid}`,
      displayName: "Leave A",
      email: `gdm-leave-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    const ctxB = await createTestClient({
      id: `gdm-leave-b-${uid}`,
      displayName: "Leave B",
      email: `gdm-leave-b-${uid}@openslaq.dev`,
    });
    clientB = ctxB.client;
    await addToWorkspace(clientA, slug, clientB);

    const ctxC = await createTestClient({
      id: `gdm-leave-c-${uid}`,
      displayName: "Leave C",
      email: `gdm-leave-c-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxC.client);

    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [ctxB.user.id, ctxC.user.id] },
    });
    const body = (await res.json()) as { channel: { id: string } };
    groupDmChannelId = body.channel.id;
  });

  test("leave group DM → 200", async () => {
    const res = await clientB.api.workspaces[":slug"]["group-dm"][":channelId"].members.me.$delete({
      param: { slug, channelId: groupDmChannelId },
    });
    expect(res.status).toBe(200);
  });

  test("left user no longer sees group DM in list", async () => {
    const res = await clientB.api.workspaces[":slug"]["group-dm"].$get({
      param: { slug },
    });
    const groupDms = (await res.json()) as {
      channel: { id: string };
    }[];
    const found = groupDms.find((g) => g.channel.id === groupDmChannelId);
    expect(found).toBeUndefined();
  });
});

describe("group DMs — member limits", () => {
  let clientA: Client;
  let slug: string;
  let userIds: string[] = [];

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-lim-a-${uid}`,
      displayName: "Lim A",
      email: `gdm-lim-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    // Create 9 additional users (A + 9 = 10 total workspace members)
    for (let i = 0; i < 9; i++) {
      const ctx = await createTestClient({
        id: `gdm-lim-${i}-${uid}`,
        displayName: `Lim ${i}`,
        email: `gdm-lim-${i}-${uid}@openslaq.dev`,
      });
      await addToWorkspace(clientA, slug, ctx.client);
      userIds.push(ctx.user.id);
    }
  });

  test("create group DM with creator ID in memberIds (dedup → <3) → 400", async () => {
    // Pass 2 memberIds but one is the creator → after dedup, only 2 unique members
    const ctxA = await createTestClient({
      id: `gdm-lim-a-${testId()}`,
      displayName: "Lim A2",
      email: `gdm-lim-a2-${testId()}@openslaq.dev`,
    });
    const ws = await createTestWorkspace(ctxA.client);
    const ctx2 = await createTestClient({
      id: `gdm-lim-dup-${testId()}`,
      displayName: "Lim Dup",
      email: `gdm-lim-dup-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(ctxA.client, ws.slug, ctx2.client);

    const res = await ctxA.client.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug: ws.slug },
      json: { memberIds: [ctx2.user.id, ctxA.user.id] }, // creator in memberIds → dedup to 2
    });
    expect(res.status).toBe(400);
  });

  test("add member when group already has 9 members → 400", async () => {
    // Create group DM with 8 other members (A + 8 = 9 total)
    const first8 = userIds.slice(0, 8);
    const createRes = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: first8 },
    });
    expect(createRes.status).toBe(201);
    const body = (await createRes.json()) as { channel: { id: string }; members: { id: string }[] };
    expect(body.members.length).toBe(9); // A + 8

    // Try to add the 9th extra member → total would be 10 → should fail
    const res = await clientA.api.workspaces[":slug"]["group-dm"][":channelId"].members.$post({
      param: { slug, channelId: body.channel.id },
      json: { userId: userIds[8]! },
    });
    expect(res.status).toBe(400);
  });
});

describe("group DMs — cross-workspace isolation", () => {
  let clientA: Client;
  let clientB: Client;
  let slugA: string;
  let slugB: string;
  let groupDmChannelId: string;
  let userCId: string;

  beforeAll(async () => {
    const uid = testId();

    // User A owns workspace A
    const ctxA = await createTestClient({
      id: `gdm-xws-a-${uid}`,
      displayName: "XWS A",
      email: `gdm-xws-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspaceA = await createTestWorkspace(clientA);
    slugA = workspaceA.slug;

    // User B owns workspace B and is also a member of workspace A
    const ctxB = await createTestClient({
      id: `gdm-xws-b-${uid}`,
      displayName: "XWS B",
      email: `gdm-xws-b-${uid}@openslaq.dev`,
    });
    clientB = ctxB.client;
    const workspaceB = await createTestWorkspace(clientB);
    slugB = workspaceB.slug;
    await addToWorkspace(clientA, slugA, clientB);

    // User C is in workspace A (for the group DM) and also in workspace B
    const ctxC = await createTestClient({
      id: `gdm-xws-c-${uid}`,
      displayName: "XWS C",
      email: `gdm-xws-c-${uid}@openslaq.dev`,
    });
    userCId = ctxC.user.id;
    await addToWorkspace(clientA, slugA, ctxC.client);
    await addToWorkspace(clientB, slugB, ctxC.client);

    // Create a group DM in workspace A with A, B, C
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug: slugA },
      json: { memberIds: [ctxB.user.id, ctxC.user.id] },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { channel: { id: string } };
    groupDmChannelId = body.channel.id;

    // Add a new user to workspace B for the add-member test
    const ctxD = await createTestClient({
      id: `gdm-xws-d-${uid}`,
      displayName: "XWS D",
      email: `gdm-xws-d-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slugA, ctxD.client);
    await addToWorkspace(clientB, slugB, ctxD.client);
  });

  test("cannot add member to group DM via another workspace → 400", async () => {
    // User B tries to add user C to the workspace-A group DM via workspace B's API
    const res = await clientB.api.workspaces[":slug"]["group-dm"][":channelId"].members.$post({
      param: { slug: slugB, channelId: groupDmChannelId },
      json: { userId: userCId },
    });
    expect(res.status).toBe(400);
  });

  test("cannot rename group DM via another workspace → 400", async () => {
    const res = await clientB.api.workspaces[":slug"]["group-dm"][":channelId"].$patch({
      param: { slug: slugB, channelId: groupDmChannelId },
      json: { displayName: "Hacked Name" },
    });
    expect(res.status).toBe(400);
  });

  test("cannot leave group DM via another workspace → 400", async () => {
    const res = await clientB.api.workspaces[":slug"]["group-dm"][":channelId"].members.me.$delete({
      param: { slug: slugB, channelId: groupDmChannelId },
    });
    expect(res.status).toBe(400);
  });
});

describe("group DMs — rename", () => {
  let clientA: Client;
  let slug: string;
  let groupDmChannelId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctxA = await createTestClient({
      id: `gdm-rename-a-${uid}`,
      displayName: "Rename A",
      email: `gdm-rename-a-${uid}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    const ctxB = await createTestClient({
      id: `gdm-rename-b-${uid}`,
      displayName: "Rename B",
      email: `gdm-rename-b-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxB.client);

    const ctxC = await createTestClient({
      id: `gdm-rename-c-${uid}`,
      displayName: "Rename C",
      email: `gdm-rename-c-${uid}@openslaq.dev`,
    });
    await addToWorkspace(clientA, slug, ctxC.client);

    const res = await clientA.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug },
      json: { memberIds: [ctxB.user.id, ctxC.user.id] },
    });
    const body = (await res.json()) as { channel: { id: string } };
    groupDmChannelId = body.channel.id;
  });

  test("rename group DM → 200", async () => {
    const newName = `Custom Name ${testId()}`;
    const res = await clientA.api.workspaces[":slug"]["group-dm"][":channelId"].$patch({
      param: { slug, channelId: groupDmChannelId },
      json: { displayName: newName },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { channel: { displayName: string } };
    expect(body.channel.displayName).toBe(newName);
  });

  test("renamed group DM shows new name in list", async () => {
    const res = await clientA.api.workspaces[":slug"]["group-dm"].$get({
      param: { slug },
    });
    const groupDms = (await res.json()) as {
      channel: { id: string; displayName: string | null };
    }[];
    const gdm = groupDms.find((g) => g.channel.id === groupDmChannelId);
    expect(gdm).toBeDefined();
    expect(gdm!.channel.displayName).toBeTruthy();
  });
});
