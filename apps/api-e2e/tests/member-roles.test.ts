import { describe, test, expect } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

interface Member {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

/**
 * Helper: create a workspace, invite a second user who joins as member.
 * Returns owner client, member client, workspace slug, and user IDs.
 */
async function setupWorkspaceWithMember() {
  const uid = testId();
  const ownerId = `owner-${uid}`;
  const memberId = `member-${uid}`;

  const { client: ownerClient } = await createTestClient({
    id: ownerId,
    email: `${ownerId}@openslaq.dev`,
    displayName: "Owner User",
  });
  const ws = await createTestWorkspace(ownerClient);

  // Create invite
  const inviteRes = await ownerClient.api.workspaces[":slug"].invites.$post({
    param: { slug: ws.slug },
    json: {},
  });
  const invite = (await inviteRes.json()) as { code: string };

  // Member joins
  const { client: memberClient } = await createTestClient({
    id: memberId,
    email: `${memberId}@openslaq.dev`,
    displayName: "Member User",
  });
  await memberClient.api.invites[":code"].accept.$post({
    param: { code: invite.code },
  });

  return { ownerClient, memberClient, slug: ws.slug, ownerId, memberId };
}

async function getMembers(client: Client, slug: string): Promise<Member[]> {
  const res = await client.api.workspaces[":slug"].members.$get({
    param: { slug },
    query: {},
  });
  return (await res.json()) as Member[];
}

async function inviteMember(ownerClient: Client, slug: string, userId: string): Promise<Client> {
  const inviteRes = await ownerClient.api.workspaces[":slug"].invites.$post({
    param: { slug },
    json: {},
  });
  const invite = (await inviteRes.json()) as { code: string };
  const { client } = await createTestClient({
    id: userId,
    email: `${userId}@openslaq.dev`,
  });
  await client.api.invites[":code"].accept.$post({
    param: { code: invite.code },
  });
  return client;
}

async function asUserClient(userId: string): Promise<Client> {
  const { client } = await createTestClient({
    id: userId,
    email: `${userId}@openslaq.dev`,
  });
  return client;
}

async function updateRole(
  actorClient: Client,
  slug: string,
  userId: string,
  role: "admin" | "member",
) {
  return actorClient.api.workspaces[":slug"].members[":userId"].role.$patch({
    param: { slug, userId },
    json: { role },
  });
}

describe("member roles", () => {
  test("workspace creator gets owner role", async () => {
    const { client } = await createTestClient();
    const ws = await createTestWorkspace(client);

    const members = await getMembers(client, ws.slug);
    expect(members.length).toBe(1);
    expect(members[0]!.role).toBe("owner");
  });

  test("members list includes roles", async () => {
    const { ownerClient, slug, ownerId, memberId } = await setupWorkspaceWithMember();

    const members = await getMembers(ownerClient, slug);
    expect(members.length).toBe(2);

    const owner = members.find((m) => m.id === ownerId);
    const member = members.find((m) => m.id === memberId);
    expect(owner!.role).toBe("owner");
    expect(member!.role).toBe("member");
  });

  test("owner can promote member to admin", async () => {
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: memberId },
      json: { role: "admin" },
    });
    expect(res.status).toBe(200);

    const members = await getMembers(ownerClient, slug);
    const member = members.find((m) => m.id === memberId);
    expect(member!.role).toBe("admin");
  });

  test("owner can demote admin to member", async () => {
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    // Promote first
    await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: memberId },
      json: { role: "admin" },
    });

    // Demote
    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: memberId },
      json: { role: "member" },
    });
    expect(res.status).toBe(200);

    const members = await getMembers(ownerClient, slug);
    const member = members.find((m) => m.id === memberId);
    expect(member!.role).toBe("member");
  });

  test("admin can promote member to admin", async () => {
    const uid = testId();
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    // Promote first member to admin
    await updateRole(ownerClient, slug, memberId, "admin");

    // Add a third user as member
    const thirdId = `third-${uid}`;
    await inviteMember(ownerClient, slug, thirdId);

    // Admin promotes third user
    const adminClient = await asUserClient(memberId);
    const res = await adminClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: thirdId },
      json: { role: "admin" },
    });
    expect(res.status).toBe(200);
  });

  test("admin cannot demote another admin → 403", async () => {
    const uid = testId();
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    // Add a second member
    const secondId = `second-admin-${uid}`;
    await inviteMember(ownerClient, slug, secondId);

    // Promote both to admin
    await updateRole(ownerClient, slug, memberId, "admin");
    await updateRole(ownerClient, slug, secondId, "admin");

    // Admin tries to demote other admin
    const adminClient = await asUserClient(memberId);
    const res = await adminClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: secondId },
      json: { role: "member" },
    });
    expect(res.status as number).toBe(403);
  });

  test("admin cannot change owner's role → 403", async () => {
    const { ownerClient, memberClient, slug, ownerId, memberId } = await setupWorkspaceWithMember();

    // Promote member to admin
    await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: memberId },
      json: { role: "admin" },
    });

    // Admin tries to change owner's role
    const res = await memberClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: ownerId },
      json: { role: "member" },
    });
    expect(res.status as number).toBe(403);
  });

  test("member cannot change roles → 403", async () => {
    const uid = testId();
    const { ownerClient, memberClient, slug } = await setupWorkspaceWithMember();

    // Add a third user
    const thirdId = `third-role-${uid}`;
    await inviteMember(ownerClient, slug, thirdId);

    // Member tries to change third user's role
    const res = await memberClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: thirdId },
      json: { role: "admin" },
    });
    expect(res.status as number).toBe(403);
  });

  test("cannot change own role → 400", async () => {
    const { ownerClient, slug, ownerId } = await setupWorkspaceWithMember();

    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: ownerId },
      json: { role: "member" },
    });
    expect(res.status as number).toBe(400);
  });

  test("owner can remove member", async () => {
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].$delete({
      param: { slug, userId: memberId },
    });
    expect(res.status).toBe(200);

    const members = await getMembers(ownerClient, slug);
    expect(members.length).toBe(1);
  });

  test("admin can remove member", async () => {
    const uid = testId();
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    // Add third user
    const thirdId = `third-rm-${uid}`;
    await inviteMember(ownerClient, slug, thirdId);

    // Promote first member to admin
    await updateRole(ownerClient, slug, memberId, "admin");

    // Admin removes third user
    const adminClient = await asUserClient(memberId);
    const res = await adminClient.api.workspaces[":slug"].members[":userId"].$delete({
      param: { slug, userId: thirdId },
    });
    expect(res.status).toBe(200);
  });

  test("admin cannot remove other admin → 403", async () => {
    const uid = testId();
    const { ownerClient, slug, memberId } = await setupWorkspaceWithMember();

    // Add second admin
    const secondId = `second-rm-${uid}`;
    await inviteMember(ownerClient, slug, secondId);

    // Promote both to admin
    await updateRole(ownerClient, slug, memberId, "admin");
    await updateRole(ownerClient, slug, secondId, "admin");

    // Admin tries to remove other admin
    const adminClient = await asUserClient(memberId);
    const res = await adminClient.api.workspaces[":slug"].members[":userId"].$delete({
      param: { slug, userId: secondId },
    });
    expect(res.status as number).toBe(403);
  });

  test("owner cannot be removed → 403", async () => {
    const { ownerClient, memberClient, slug, ownerId, memberId } = await setupWorkspaceWithMember();

    // Promote member to admin
    await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: memberId },
      json: { role: "admin" },
    });

    // Admin tries to remove owner
    const res = await memberClient.api.workspaces[":slug"].members[":userId"].$delete({
      param: { slug, userId: ownerId },
    });
    expect(res.status as number).toBe(403);
  });

  test("cannot remove self → 400", async () => {
    const { ownerClient, slug, ownerId } = await setupWorkspaceWithMember();

    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].$delete({
      param: { slug, userId: ownerId },
    });
    expect(res.status as number).toBe(400);
  });

  test("update role of non-existent member → 404", async () => {
    const { ownerClient, slug } = await setupWorkspaceWithMember();
    const fakeUserId = `nonexistent-${testId()}`;

    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: fakeUserId },
      json: { role: "admin" },
    });
    expect(res.status).toBe(404);
  });

  test("remove non-existent member → 404", async () => {
    const { ownerClient, slug } = await setupWorkspaceWithMember();
    const fakeUserId = `nonexistent-${testId()}`;

    const res = await ownerClient.api.workspaces[":slug"].members[":userId"].$delete({
      param: { slug, userId: fakeUserId },
    });
    expect(res.status).toBe(404);
  });

  test("member can create invite → 201", async () => {
    const { memberClient, slug } = await setupWorkspaceWithMember();

    const res = await memberClient.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: {},
    });
    expect(res.status as number).toBe(201);
  });

  test("member can list invites → 200", async () => {
    const { memberClient, slug } = await setupWorkspaceWithMember();

    const res = await memberClient.api.workspaces[":slug"].invites.$get({
      param: { slug },
    });
    expect(res.status as number).toBe(200);
  });

  test("owner can delete workspace", async () => {
    const { ownerClient, slug } = await setupWorkspaceWithMember();

    const res = await ownerClient.api.workspaces[":slug"].$delete({
      param: { slug },
    });
    expect(res.status).toBe(200);

    // Verify workspace is gone
    const checkRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(checkRes.status as number).toBe(404);
  });

  test("admin cannot delete workspace → 403", async () => {
    const { ownerClient, memberClient, slug, memberId } = await setupWorkspaceWithMember();

    // Promote to admin
    await ownerClient.api.workspaces[":slug"].members[":userId"].role.$patch({
      param: { slug, userId: memberId },
      json: { role: "admin" },
    });

    const res = await memberClient.api.workspaces[":slug"].$delete({
      param: { slug },
    });
    expect(res.status as number).toBe(403);
  });

  test("member cannot delete workspace → 403", async () => {
    const { memberClient, slug } = await setupWorkspaceWithMember();

    const res = await memberClient.api.workspaces[":slug"].$delete({
      param: { slug },
    });
    expect(res.status as number).toBe(403);
  });
});
