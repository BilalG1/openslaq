import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("browse channels", () => {
  let ownerClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let memberClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    ownerClient = ctx.client;
    const workspace = await createTestWorkspace(ownerClient);
    slug = workspace.slug;

    const memberCtx = await createTestClient({
      id: `browse-member-${testId()}`,
      displayName: "Browse Member",
      email: `browse-member-${testId()}@openslaq.dev`,
    });
    memberClient = memberCtx.client;
    await addToWorkspace(ownerClient, slug, memberClient);
  });

  test("returns public channels with isMember flag", async () => {
    const res = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { id: string; name: string; type: string; isMember: boolean; memberCount: number }[];
    expect(channels.length).toBeGreaterThan(0);
    // All returned channels should be public
    for (const ch of channels) {
      expect(ch.type).toBe("public");
      expect(typeof ch.isMember).toBe("boolean");
      expect(typeof ch.memberCount).toBe("number");
    }
  });

  test("excludes private channels for non-members", async () => {
    const name = `priv-browse-${testId()}`;
    await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });

    // Non-member should NOT see the private channel
    const res = await memberClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await res.json()) as { name: string; type: string }[];
    const found = channels.find((c) => c.name === name);
    expect(found).toBeUndefined();
  });

  test("includes private channels for members", async () => {
    const name = `priv-browse-member-${testId()}`;
    await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });

    // Owner (who auto-joined) should see the private channel
    const res = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await res.json()) as { name: string; type: string }[];
    const found = channels.find((c) => c.name === name);
    expect(found).toBeDefined();
    expect(found!.type).toBe("private");
  });

  test("isMember is true for channels user belongs to", async () => {
    // Owner auto-joined #general when workspace was created
    const res = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await res.json()) as { name: string; isMember: boolean }[];
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();
    expect(general!.isMember).toBe(true);
  });

  test("isMember is false for channels user has not joined", async () => {
    const name = `unjoined-${testId()}`;
    await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });

    // Member hasn't joined this new channel
    const res = await memberClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await res.json()) as { name: string; isMember: boolean }[];
    const ch = channels.find((c) => c.name === name);
    expect(ch).toBeDefined();
    expect(ch!.isMember).toBe(false);
  });

  test("joining a channel updates isMember to true", async () => {
    const name = `join-test-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Before join
    let res = await memberClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    let channels = (await res.json()) as { id: string; isMember: boolean }[];
    let found = channels.find((c) => c.id === channel.id);
    expect(found?.isMember).toBe(false);

    // Join
    await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });

    // After join
    res = await memberClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    channels = (await res.json()) as { id: string; isMember: boolean }[];
    found = channels.find((c) => c.id === channel.id);
    expect(found?.isMember).toBe(true);
  });

  test("includes memberCount per channel", async () => {
    const res = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await res.json()) as { name: string; memberCount: number }[];
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();
    // At least owner + member are in #general
    expect(general!.memberCount).toBeGreaterThanOrEqual(2);
  });

  test("results ordered alphabetically by name", async () => {
    const res = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await res.json()) as { name: string }[];
    const names = channels.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});
