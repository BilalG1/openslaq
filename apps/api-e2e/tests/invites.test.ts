import { describe, test, expect } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("invites", () => {
  test("create invite → 201 with code", async () => {
    const { client } = await createTestClient();
    const ws = await createTestWorkspace(client);

    const res = await client.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    expect(res.status).toBe(201);
    const invite = (await res.json()) as { id: string; code: string; workspaceId: string };
    expect(invite.id).toBeDefined();
    expect(invite.code).toBeDefined();
    expect(invite.code.length).toBeGreaterThanOrEqual(8);
    expect(invite.workspaceId).toBe(ws.id);
  });

  test("list invites → returns created invites", async () => {
    const { client } = await createTestClient();
    const wsA = await createTestWorkspace(client);
    const wsB = await createTestWorkspace(client);

    const inviteARes = await client.api.workspaces[":slug"].invites.$post({
      param: { slug: wsA.slug },
      json: {},
    });
    expect(inviteARes.status).toBe(201);
    const inviteA = (await inviteARes.json()) as { id: string };

    const inviteBRes = await client.api.workspaces[":slug"].invites.$post({
      param: { slug: wsB.slug },
      json: {},
    });
    expect(inviteBRes.status).toBe(201);
    const inviteB = (await inviteBRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].invites.$get({
      param: { slug: wsA.slug },
    });
    expect(res.status).toBe(200);
    const invites = (await res.json()) as { id: string; code: string }[];
    expect(invites.length).toBe(1);
    expect(invites.some((invite) => invite.id === inviteA.id)).toBe(true);
    expect(invites.some((invite) => invite.id === inviteB.id)).toBe(false);
  });

  test("preview invite → returns workspace info", async () => {
    const { client } = await createTestClient();
    const ws = await createTestWorkspace(client);

    const createRes = await client.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    const invite = (await createRes.json()) as { code: string };

    const res = await client.api.invites[":code"].$get({
      param: { code: invite.code },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { workspaceName: string; workspaceSlug: string };
    expect(data.workspaceSlug).toBe(ws.slug);
    expect(data.workspaceName).toBe(ws.name);
  });

  test("accept invite → second user joins workspace", async () => {
    const uid = testId();
    const { client: client1 } = await createTestClient({ id: `inv-owner-${uid}`, email: `inv-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(client1);

    const createRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    const invite = (await createRes.json()) as { code: string };

    const { client: client2 } = await createTestClient({ id: `inv-joiner-${uid}`, email: `inv-joiner-${uid}@openslaq.dev` });
    const acceptRes = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(acceptRes.status).toBe(200);
    const acceptData = (await acceptRes.json()) as { slug: string };
    expect(acceptData.slug).toBe(ws.slug);

    // Verify user is a member
    const membersRes = await client2.api.workspaces[":slug"].members.$get({
      param: { slug: ws.slug },
      query: {},
    });
    expect(membersRes.status).toBe(200);
    const members = (await membersRes.json()) as { id: string }[];
    const found = members.find((m) => m.id === `inv-joiner-${uid}`);
    expect(found).toBeDefined();
  });

  test("accept invite auto-joins user to #general", async () => {
    const uid = testId();
    const { client: client1 } = await createTestClient({ id: `inv-gen-owner-${uid}`, email: `inv-gen-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(client1);

    const createRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    const invite = (await createRes.json()) as { code: string };

    const { client: client2 } = await createTestClient({ id: `inv-gen-join-${uid}`, email: `inv-gen-join-${uid}@openslaq.dev` });
    const acceptRes = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(acceptRes.status).toBe(200);

    // Verify user can post to #general (proves channel membership)
    const channelsRes = await client2.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    const channels = (await channelsRes.json()) as { id: string; name: string }[];
    const general = channels.find((ch) => ch.name === "general");
    expect(general).toBeDefined();

    const msgRes = await client2.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: general!.id },
      json: { content: "hello from invited user" },
    });
    expect(msgRes.status).toBe(201);
  });

  test("accept twice → idempotent, useCount only increments once", async () => {
    const uid = testId();
    const { client: client1 } = await createTestClient({ id: `inv-idem-owner-${uid}`, email: `inv-idem-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(client1);

    // Create invite with maxUses: 2
    const createRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: { maxUses: 2 },
    });
    const invite = (await createRes.json()) as { code: string };

    // First user accepts twice
    const { client: client2 } = await createTestClient({ id: `inv-idem-join-${uid}`, email: `inv-idem-join-${uid}@openslaq.dev` });
    const res1 = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(res1.status).toBe(200);

    const res2 = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(res2.status).toBe(200);

    // Second user should still be able to accept (useCount should be 1, not 2)
    const { client: client3 } = await createTestClient({ id: `inv-idem-join2-${uid}`, email: `inv-idem-join2-${uid}@openslaq.dev` });
    const res3 = await client3.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(res3.status).toBe(200);
  });

  test("maxUses enforced → 410 after limit reached", async () => {
    const uid = testId();
    const { client: client1 } = await createTestClient({ id: `inv-max-owner-${uid}`, email: `inv-max-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(client1);

    // Create invite with maxUses: 1
    const createRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: { maxUses: 1 },
    });
    const invite = (await createRes.json()) as { code: string };

    // First user accepts
    const { client: client2 } = await createTestClient({ id: `inv-max-joinA-${uid}`, email: `inv-max-joinA-${uid}@openslaq.dev` });
    const res1 = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(res1.status).toBe(200);

    // Second user should be rejected
    const { client: client3 } = await createTestClient({ id: `inv-max-joinB-${uid}`, email: `inv-max-joinB-${uid}@openslaq.dev` });
    const res2 = await client3.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(res2.status).toBe(410);
  });

  test("concurrent acceptance with maxUses=1 → exactly one succeeds", async () => {
    const uid = testId();
    const { client: ownerClient } = await createTestClient({ id: `inv-conc-owner-${uid}`, email: `inv-conc-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(ownerClient);

    // Create invite with maxUses: 1
    const createRes = await ownerClient.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: { maxUses: 1 },
    });
    const invite = (await createRes.json()) as { code: string };

    // Two different users accept concurrently
    const { client: clientX } = await createTestClient({ id: `inv-conc-x-${uid}`, email: `inv-conc-x-${uid}@openslaq.dev` });
    const { client: clientY } = await createTestClient({ id: `inv-conc-y-${uid}`, email: `inv-conc-y-${uid}@openslaq.dev` });

    const [resX, resY] = await Promise.all([
      clientX.api.invites[":code"].accept.$post({ param: { code: invite.code } }),
      clientY.api.invites[":code"].accept.$post({ param: { code: invite.code } }),
    ]);

    const statuses = [resX.status, resY.status].sort();
    // Exactly one should succeed (200) and one should fail (410)
    expect(statuses).toEqual([200, 410]);
  });

  test("revoke invite → 410 on accept", async () => {
    const uid = testId();
    const { client: client1 } = await createTestClient({ id: `inv-rev-owner-${uid}`, email: `inv-rev-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(client1);

    const createRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    const invite = (await createRes.json()) as { id: string; code: string };

    // Revoke
    const revokeRes = await client1.api.workspaces[":slug"].invites[":inviteId"].$delete({
      param: { slug: ws.slug, inviteId: invite.id },
    });
    expect(revokeRes.status).toBe(200);

    // Try to accept
    const { client: client2 } = await createTestClient({ id: `inv-rev-join-${uid}`, email: `inv-rev-join-${uid}@openslaq.dev` });
    const acceptRes = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(acceptRes.status).toBe(410);
  });

  test("leave workspace then accept invite to rejoin → 200", async () => {
    const uid = testId();
    const { client: ownerClient } = await createTestClient({ id: `inv-rejoin-owner-${uid}`, email: `inv-rejoin-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(ownerClient);

    // Create invite
    const createRes = await ownerClient.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    const invite = (await createRes.json()) as { code: string };

    // Second user joins via invite
    const { client: joinerClient } = await createTestClient({ id: `inv-rejoin-join-${uid}`, email: `inv-rejoin-join-${uid}@openslaq.dev` });
    const acceptRes1 = await joinerClient.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    expect(acceptRes1.status).toBe(200);

    // Second user leaves the workspace
    const leaveRes = await joinerClient.api.workspaces[":slug"].members.leave.$post({
      param: { slug: ws.slug },
    });
    expect(leaveRes.status).toBe(200);

    // Verify user is no longer a member
    const membersRes1 = await ownerClient.api.workspaces[":slug"].members.$get({
      param: { slug: ws.slug },
      query: {},
    });
    const members1 = (await membersRes1.json()) as { id: string }[];
    expect(members1.find((m) => m.id === `inv-rejoin-join-${uid}`)).toBeUndefined();

    // Create a new invite and have the user rejoin
    const createRes2 = await ownerClient.api.workspaces[":slug"].invites.$post({
      param: { slug: ws.slug },
      json: {},
    });
    const invite2 = (await createRes2.json()) as { code: string };

    const acceptRes2 = await joinerClient.api.invites[":code"].accept.$post({
      param: { code: invite2.code },
    });
    expect(acceptRes2.status).toBe(200);

    // Verify user is a member again
    const membersRes2 = await ownerClient.api.workspaces[":slug"].members.$get({
      param: { slug: ws.slug },
      query: {},
    });
    const members2 = (await membersRes2.json()) as { id: string }[];
    expect(members2.find((m) => m.id === `inv-rejoin-join-${uid}`)).toBeDefined();
  });

  test("revoke nonexistent invite → 404", async () => {
    const { client } = await createTestClient();
    const ws = await createTestWorkspace(client);

    const res = await client.api.workspaces[":slug"].invites[":inviteId"].$delete({
      param: { slug: ws.slug, inviteId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });

  test("invalid code → 404", async () => {
    const { client } = await createTestClient();
    const res = await client.api.invites[":code"].$get({
      param: { code: "nonexistent-code" },
    });
    expect(res.status).toBe(404);
  });
});
