import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  cleanupTestWorkspaces,
  testId,
} from "../helpers/api-client";
import { signTestJwt } from "@openslaq/test-utils";
import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { getBaseUrl } from "../helpers/api-client";

type Client = ReturnType<typeof hc<AppType>>;

describe("unread command (integration)", () => {
  let clientA: Client;
  let clientB: Client;
  let slug: string;
  let channelId: string;
  const userAId = `cli-unread-a-${testId()}`;
  const userBId = `cli-unread-b-${testId()}`;

  beforeAll(async () => {
    // Create user A and workspace
    const ctxA = await createTestClient({
      id: userAId,
      displayName: "Unread User A",
      email: `${userAId}@openslaq.dev`,
    });
    clientA = ctxA.client;
    const workspace = await createTestWorkspace(clientA);
    slug = workspace.slug;

    // Create user B and add to workspace via invite
    const tokenB = await signTestJwt({
      id: userBId,
      displayName: "Unread User B",
      email: `${userBId}@openslaq.dev`,
      emailVerified: true,
    });
    clientB = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const inviteRes = await clientA.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: {},
    });
    if (inviteRes.status !== 201) throw new Error(`Failed to create invite: ${inviteRes.status}`);
    const invite = (await inviteRes.json()) as { code: string };
    const acceptRes = await clientB.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    if (acceptRes.status !== 200) throw new Error(`Failed to accept invite: ${acceptRes.status}`);

    // Get #general channel
    const listRes = await clientA.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string; name: string }[];
    const general = channels.find((c) => c.name === "general");
    if (!general) throw new Error("No #general channel found");
    channelId = general.id;

    // Mark channel as read for user A so we start clean
    await clientA.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("send message as user B, user A sees unread count", async () => {
    // User B sends a message
    const sendRes = await clientB.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `Unread test ${testId()}` },
    });
    expect(sendRes.status).toBe(201);

    // User A checks unread counts
    const unreadRes = await clientA.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(unreadRes.status).toBe(200);
    const counts = (await unreadRes.json()) as Record<string, number>;
    expect(counts[channelId]).toBeGreaterThan(0);
  });

  test("mark-all-read clears all unread counts", async () => {
    // User B sends another message
    const sendRes = await clientB.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `Mark-all-read test ${testId()}` },
    });
    expect(sendRes.status).toBe(201);

    // Verify user A has unreads
    const beforeRes = await clientA.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(beforeRes.status).toBe(200);
    const beforeCounts = (await beforeRes.json()) as Record<string, number>;
    expect(beforeCounts[channelId]).toBeGreaterThan(0);

    // Mark all as read
    const markRes = await clientA.api.workspaces[":slug"].unreads["mark-all-read"].$post({
      param: { slug },
    });
    expect(markRes.status).toBe(200);
    const markData = (await markRes.json()) as { ok: boolean };
    expect(markData.ok).toBe(true);

    // Verify counts are now 0
    const afterRes = await clientA.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(afterRes.status).toBe(200);
    const afterCounts = (await afterRes.json()) as Record<string, number>;
    expect(afterCounts[channelId] ?? 0).toBe(0);
  });

  test("mark channel read clears unread count", async () => {
    // Mark as read
    const readRes = await clientA.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });
    expect(readRes.status).toBe(200);

    // Check unread counts again
    const unreadRes = await clientA.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(unreadRes.status).toBe(200);
    const counts = (await unreadRes.json()) as Record<string, number>;
    // Channel should have 0 or not be present
    expect(counts[channelId] ?? 0).toBe(0);
  });
});
