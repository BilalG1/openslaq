import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, getBaseUrl, testId } from "./helpers/api-client";

describe("push notifications", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `push-user-${testId()}`,
      displayName: "Push Test User",
      email: `push-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    client = ctx.client;
    // Create a workspace so the user exists in the DB
    await createTestWorkspace(client);
  });

  describe("push tokens", () => {
    test("POST /api/push-tokens registers token → 200", async () => {
      const res = await client.api["push-tokens"].$post({
        json: { token: `apns-token-${testId()}`, platform: "ios" as const },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });

    test("POST same token from same user is idempotent", async () => {
      const token = `apns-idempotent-${testId()}`;
      const res1 = await client.api["push-tokens"].$post({
        json: { token, platform: "ios" as const },
      });
      expect(res1.status).toBe(200);

      const res2 = await client.api["push-tokens"].$post({
        json: { token, platform: "ios" as const },
      });
      expect(res2.status).toBe(200);
    });

    test("POST same token from different user updates userId (upsert)", async () => {
      const sharedToken = `apns-shared-${testId()}`;

      // User 1 registers
      const res1 = await client.api["push-tokens"].$post({
        json: { token: sharedToken, platform: "ios" as const },
      });
      expect(res1.status).toBe(200);

      // User 2 registers the same token
      const ctx2 = await createTestClient({
        id: `push-user2-${testId()}`,
        displayName: "Push Test User 2",
        email: `push2-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      await createTestWorkspace(ctx2.client);

      const res2 = await ctx2.client.api["push-tokens"].$post({
        json: { token: sharedToken, platform: "ios" as const },
      });
      expect(res2.status).toBe(200);
    });

    test("DELETE /api/push-tokens removes token → 200", async () => {
      const token = `apns-delete-${testId()}`;

      // Register first
      await client.api["push-tokens"].$post({
        json: { token, platform: "ios" as const },
      });

      // Delete
      const res = await client.api["push-tokens"].$delete({
        json: { token },
      });
      expect(res.status).toBe(200);
    });

    test("DELETE non-existent token is a no-op → 200", async () => {
      const res = await client.api["push-tokens"].$delete({
        json: { token: "non-existent-token" },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("notification preferences", () => {
    test("GET /api/users/me/notification-preferences returns defaults", async () => {
      // Use a fresh user that hasn't set any prefs
      const ctx = await createTestClient({
        id: `push-prefs-${testId()}`,
        displayName: "Prefs User",
        email: `prefs-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      await createTestWorkspace(ctx.client);

      const res = await ctx.client.api.users.me["notification-preferences"].$get({});
      expect(res.status).toBe(200);
      const body = (await res.json()) as { pushEnabled: boolean; soundEnabled: boolean };
      expect(body.pushEnabled).toBe(true);
      expect(body.soundEnabled).toBe(true);
    });

    test("PUT /api/users/me/notification-preferences updates fields", async () => {
      const res = await client.api.users.me["notification-preferences"].$put({
        json: { pushEnabled: false, soundEnabled: false },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { pushEnabled: boolean; soundEnabled: boolean };
      expect(body.pushEnabled).toBe(false);
      expect(body.soundEnabled).toBe(false);
    });

    test("partial update preserves other fields", async () => {
      // Set both to false first
      await client.api.users.me["notification-preferences"].$put({
        json: { pushEnabled: false, soundEnabled: false },
      });

      // Only update pushEnabled
      const res = await client.api.users.me["notification-preferences"].$put({
        json: { pushEnabled: true },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { pushEnabled: boolean; soundEnabled: boolean };
      expect(body.pushEnabled).toBe(true);
      expect(body.soundEnabled).toBe(false);
    });

    test("GET reflects updated values", async () => {
      // Use a fresh user to avoid rate limiting from prior tests
      const ctx = await createTestClient({
        id: `push-reflect-${testId()}`,
        displayName: "Reflect User",
        email: `push-reflect-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      await createTestWorkspace(ctx.client);

      await ctx.client.api.users.me["notification-preferences"].$put({
        json: { pushEnabled: false, soundEnabled: false },
      });

      const res = await ctx.client.api.users.me["notification-preferences"].$get({});
      expect(res.status).toBe(200);
      const body = (await res.json()) as { pushEnabled: boolean; soundEnabled: boolean };
      expect(body.pushEnabled).toBe(false);
      expect(body.soundEnabled).toBe(false);
    });
  });

  describe("auth required", () => {
    test("POST /api/push-tokens without auth → 401", async () => {
      const res = await fetch(`${getBaseUrl()}/api/push-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "test", platform: "ios" }),
      });
      expect(res.status).toBe(401);
    });

    test("GET /api/users/me/notification-preferences without auth → 401", async () => {
      const res = await fetch(
        `${getBaseUrl()}/api/users/me/notification-preferences`,
      );
      expect(res.status).toBe(401);
    });
  });
});
