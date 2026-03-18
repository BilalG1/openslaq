import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  testId,
  getBaseUrl,
} from "./helpers/api-client";
import { quotas } from "../../api/src/workspaces/service";

describe("abuse mitigation", () => {
  describe("dev-sign-in production guard", () => {
    test("dev-sign-in returns 401 (not 404) in non-production", async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/dev-sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "wrong-secret" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("scheduled message quota", () => {
    test("rejects creation after 50 pending scheduled messages", async () => {
      const id = testId();
      const ctx = await createTestClient({
        id: `sched-q-${id}`,
        displayName: "Sched Q User",
        email: `sched-q-${id}@openslaq.dev`,
      });
      const ws = await createTestWorkspace(ctx.client);

      const channelsRes = await ctx.client.api.workspaces[":slug"].channels.$get({
        param: { slug: ws.slug },
      });
      const chans = (await channelsRes.json()) as Array<{ id: string }>;
      const channelId = chans[0]!.id;

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      for (let i = 0; i < 50; i++) {
        const res = await ctx.client.api.workspaces[":slug"]["scheduled-messages"].$post({
          param: { slug: ws.slug },
          json: { channelId, content: `Sched ${i}`, scheduledFor: futureDate },
        });
        expect(res.status).toBe(201);
      }

      const overLimitRes = await ctx.client.api.workspaces[":slug"]["scheduled-messages"].$post({
        param: { slug: ws.slug },
        json: { channelId, content: "Over limit", scheduledFor: futureDate },
      });
      expect(overLimitRes.status).toBe(400);
      const body = (await overLimitRes.json()) as { error: string };
      expect(body.error).toContain("pending scheduled messages");
    });
  });

  describe("workspace creation quota", () => {
    const savedQuota = quotas.maxWorkspacesPerUser;

    beforeAll(() => {
      // Temporarily lower the quota to test enforcement
      quotas.maxWorkspacesPerUser = 3;
    });

    afterAll(() => {
      quotas.maxWorkspacesPerUser = savedQuota;
    });

    test("rejects creation when workspace quota exceeded", async () => {
      const id = testId();
      const ctx = await createTestClient({
        id: `ws-q-${id}`,
        displayName: "WS Q User",
        email: `ws-q-${id}@openslaq.dev`,
      });

      // Create up to the quota (3 for this test)
      for (let i = 0; i < 3; i++) {
        const res = await ctx.client.api.workspaces.$post({
          json: { name: `WS ${id} ${i}` },
        });
        expect(res.status).toBe(201);
      }

      // The next one should fail
      const overLimitRes = await ctx.client.api.workspaces.$post({
        json: { name: `WS Over Limit ${id}` },
      });
      expect(overLimitRes.status).toBe(400);
      const body = (await overLimitRes.json()) as { error: string };
      expect(body.error).toContain("workspaces per user");
    });
  });

  describe("bot creation cap", () => {
    test("rejects creation after 25 bots", async () => {
      const id = testId();
      const ctx = await createTestClient({
        id: `bot-cap-${id}`,
        displayName: "Bot Cap User",
        email: `bot-cap-${id}@openslaq.dev`,
      });
      const ws = await createTestWorkspace(ctx.client);

      for (let i = 0; i < 25; i++) {
        const res = await ctx.client.api.workspaces[":slug"].bots.$post({
          param: { slug: ws.slug },
          json: {
            name: `Bot ${i} ${id}`,
            webhookUrl: "https://example.com/webhook",
            scopes: ["chat:read"],
          },
        });
        expect(res.status).toBe(201);
      }

      const overLimitRes = await ctx.client.api.workspaces[":slug"].bots.$post({
        param: { slug: ws.slug },
        json: {
          name: `Bot Over Limit ${id}`,
          webhookUrl: "https://example.com/webhook",
          scopes: ["chat:read"],
        },
      });
      expect(overLimitRes.status).toBe(400);
      const body = (await overLimitRes.json()) as { error: string };
      expect(body.error).toContain("25 bots");
    });
  });

  describe("upload storage quota", () => {
    test("small upload succeeds under quota", async () => {
      const id = testId();
      const ctx = await createTestClient({
        id: `upload-q-${id}`,
        displayName: "Upload Q User",
        email: `upload-q-${id}@openslaq.dev`,
      });

      const formData = new FormData();
      formData.append("files", new File(["hello"], "test.txt", { type: "text/plain" }));

      const res = await fetch(`${getBaseUrl()}/api/uploads`, {
        method: "POST",
        headers: { Authorization: ctx.headers.Authorization },
        body: formData,
      });
      expect(res.status).toBe(201);
    });
  });
});
