import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("private channels", () => {
  let ownerClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let memberClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let memberId: string;

  beforeAll(async () => {
    // Owner creates workspace
    const ctx = await createTestClient();
    ownerClient = ctx.client;
    const workspace = await createTestWorkspace(ownerClient);
    slug = workspace.slug;

    // Regular member joins workspace
    const memberCtx = await createTestClient({
      id: `priv-member-${testId()}`,
      displayName: "Private Channel Member",
      email: `priv-member-${testId()}@openslaq.dev`,
    });
    memberClient = memberCtx.client;
    memberId = memberCtx.user.id;
    await addToWorkspace(ownerClient, slug, memberClient);
  });

  test("admin can create a private channel", async () => {
    const name = `priv-${testId()}`;
    const res = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    expect(res.status).toBe(201);
    const channel = (await res.json()) as { id: string; name: string; type: string };
    expect(channel.type).toBe("private");
    expect(channel.name).toBe(name);
  });

  test("non-admin gets 403 creating private channel", async () => {
    const name = `priv-fail-${testId()}`;
    const res = await memberClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    expect(res.status).toBe(403);
  });

  test("private channel hidden from non-member list", async () => {
    const name = `hidden-${testId()}`;
    await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });

    const res = await memberClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await res.json()) as { name: string }[];
    const found = channels.find((c) => c.name === name);
    expect(found).toBeUndefined();
  });

  test("private channel visible to creator", async () => {
    const name = `visible-${testId()}`;
    await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });

    const res = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await res.json()) as { name: string }[];
    const found = channels.find((c) => c.name === name);
    expect(found).toBeDefined();
  });

  test("self-join blocked for private channels — non-member gets 404", async () => {
    const name = `no-join-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Non-member tries to get the channel — should get 404 (channel hidden)
    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });
    // Non-member gets 404 from resolveChannel (channel is hidden)
    expect(joinRes.status as number).toBe(404);
  });

  test("self-join blocked for private channels — member gets 403", async () => {
    const name = `no-self-join-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Add member to the private channel first
    await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: memberId },
    });

    // Member tries to self-join — should get 403 (already a member, but self-join disallowed)
    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });
    expect(joinRes.status).toBe(403);
    const body = (await joinRes.json()) as { error: string };
    expect(body.error).toBe("Cannot self-join a private channel");
  });

  test("non-member gets 404 on private channel endpoints", async () => {
    const name = `hidden-ep-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Non-member tries to get members — should get 404
    const membersRes = await memberClient.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    expect(membersRes.status as number).toBe(404);
  });

  test("add member — member can then see channel", async () => {
    const name = `add-mem-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Add member
    const addRes = await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: memberId },
    });
    expect(addRes.status).toBe(201);

    // Member can now see the channel in list
    const listRes = await memberClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string; name: string }[];
    const found = channels.find((c) => c.id === channel.id);
    expect(found).toBeDefined();

    // Member can access members endpoint
    const membersRes = await memberClient.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    expect(membersRes.status).toBe(200);
  });

  test("cannot add non-workspace user to private channel (400)", async () => {
    const name = `add-outsider-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    expect(createRes.status).toBe(201);
    const channel = (await createRes.json()) as { id: string };

    const outsider = await createTestClient({
      id: `priv-outsider-${testId()}`,
      displayName: "Private Outsider",
      email: `priv-outsider-${testId()}@openslaq.dev`,
    });

    const addRes = await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: outsider.user.id },
    });
    expect(addRes.status).toBe(400);

    // Outsider should still not see the private channel.
    const listRes = await outsider.client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(listRes.status as number).toBe(403);
  });

  test("remove member — member can no longer see channel", async () => {
    const name = `rm-mem-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Add then remove
    await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: memberId },
    });
    const removeRes = await ownerClient.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug, id: channel.id, userId: memberId },
    });
    expect(removeRes.status).toBe(200);

    // Member can no longer see the channel
    const listRes = await memberClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string }[];
    const found = channels.find((c) => c.id === channel.id);
    expect(found).toBeUndefined();
  });

  test("any channel member can add workspace members to private channel", async () => {
    const name = `no-perm-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Add member so they can at least access the channel
    await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: memberId },
    });

    // Create a third user to try to add
    const thirdCtx = await createTestClient({
      id: `priv-third-${testId()}`,
      displayName: "Third User",
      email: `priv-third-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(ownerClient, slug, thirdCtx.client);

    // Any channel member can add other workspace members to a private channel
    const addRes = await memberClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: thirdCtx.user.id },
    }) as unknown as Response;
    expect(addRes.status).toBe(201);
  });

  test("cannot remove the channel creator (400)", async () => {
    const name = `no-rm-creator-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string; createdBy: string };

    const removeRes = await ownerClient.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug, id: channel.id, userId: channel.createdBy },
    });
    expect(removeRes.status).toBe(400);
  });

  test("private channel message access via /api/messages/:id", async () => {
    const name = `priv-msg-access-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Owner sends a message in private channel
    const msgRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel.id },
      json: { content: `priv-msg-${testId()}` },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Non-member tries GET /api/messages/:id → 404
    const nonMemberRes = await memberClient.api.messages[":id"].$get({
      param: { id: msg.id },
    });
    expect(nonMemberRes.status).toBe(404);

    // Add member to private channel
    await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: memberId },
    });

    // Now member can access → 200
    const memberRes = await memberClient.api.messages[":id"].$get({
      param: { id: msg.id },
    });
    expect(memberRes.status).toBe(200);
    const body = (await memberRes.json()) as { id: string };
    expect(body.id).toBe(msg.id);
  });

  test("workspace admin can manage members even if not creator", async () => {
    // Promote memberClient to admin
    const adminCtx = await createTestClient({
      id: `priv-admin-${testId()}`,
      displayName: "Admin User",
      email: `priv-admin-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(ownerClient, slug, adminCtx.client);
    // Promote to admin
    await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: adminCtx.user.id },
      json: { role: "admin" },
    });

    // Admin creates a private channel
    const name = `admin-manage-${testId()}`;
    const createRes = await adminCtx.client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Owner (workspace admin) should be able to manage members
    // First they need to be added to see the channel
    await adminCtx.client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: (await createTestClient()).user.id },
    });
    // Workspace owner can also manage since they're admin+
    // Owner needs to be a member first
    const ownerUserId = (await ownerClient.api.workspaces[":slug"].members.$get({ param: { slug }, query: {} })
      .then(r => r.json()) as { id: string; role: string }[])
      .find(m => m.role === "owner")?.id;

    expect(ownerUserId).toBeDefined();

    await adminCtx.client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: ownerUserId! },
    });

    // Owner can add another member
    const addRes = await ownerClient.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: memberId },
    });
    expect(addRes.status).toBe(201);
  });
});
