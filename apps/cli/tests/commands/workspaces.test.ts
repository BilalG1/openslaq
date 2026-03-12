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

describe("workspaces command (integration)", () => {
  let client: Client;
  let workspaceName: string;
  let slug: string;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-ws-${testId()}`,
      displayName: "CLI Workspaces User",
      email: `cli-ws-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    workspaceName = workspace.name;
    slug = workspace.slug;
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("list workspaces returns at least one workspace", async () => {
    const res = await client.api.workspaces.$get();
    expect(res.status).toBe(200);
    const workspaces = (await res.json()) as { name: string; slug: string }[];
    expect(workspaces.length).toBeGreaterThan(0);
    const names = workspaces.map((w) => w.name);
    expect(names).toContain(workspaceName);
  });

  test("create a workspace", async () => {
    const name = `CLI WS ${testId()}`;
    const res = await client.api.workspaces.$post({
      json: { name },
    });
    expect(res.status).toBe(201);
    const workspace = (await res.json()) as { name: string; slug: string };
    expect(workspace.name).toBe(name);
    expect(workspace.slug).toBeTruthy();

    // Clean up the created workspace
    await client.api.workspaces[":slug"].$delete({ param: { slug: workspace.slug } });
  });

  test("list workspace members", async () => {
    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { displayName: string; email: string; role: string }[];
    expect(members.length).toBeGreaterThan(0);
    // Creator should be owner
    const creator = members.find((m) => m.displayName === "CLI Workspaces User");
    expect(creator).toBeDefined();
    expect(creator!.role).toBe("owner");
  });

  test("create, list, and revoke an invite", async () => {
    // Create invite
    const createRes = await client.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: { maxUses: 5 },
    });
    expect(createRes.status).toBe(201);
    const invite = (await createRes.json()) as { id: string; code: string; maxUses: number | null };
    expect(invite.code).toBeTruthy();
    expect(invite.maxUses).toBe(5);

    // List invites
    const listRes = await client.api.workspaces[":slug"].invites.$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const invites = (await listRes.json()) as { id: string; code: string }[];
    const found = invites.find((i) => i.id === invite.id);
    expect(found).toBeDefined();

    // Revoke invite
    const revokeRes = await client.api.workspaces[":slug"].invites[":inviteId"].$delete({
      param: { slug, inviteId: invite.id },
    });
    expect(revokeRes.status).toBe(200);

    // Verify revoked — invite should no longer appear in the active list
    const listAfter = await client.api.workspaces[":slug"].invites.$get({
      param: { slug },
    });
    const invitesAfter = (await listAfter.json()) as { id: string }[];
    const stillActive = invitesAfter.find((i) => i.id === invite.id);
    expect(stillActive).toBeUndefined();
  });
});
