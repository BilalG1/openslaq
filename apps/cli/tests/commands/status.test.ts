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

describe("status command (integration)", () => {
  let client: Client;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-status-${testId()}`,
      displayName: "CLI Status User",
      email: `cli-status-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    // Create workspace so user is upserted
    await createTestWorkspace(client);
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("set status and verify via GET /me", async () => {
    const setRes = await client.api.users.me.status.$put({
      json: { emoji: "🏠", text: "Working from home", expiresAt: null },
    });
    expect(setRes.status).toBe(200);
    const user = (await setRes.json()) as { statusEmoji: string | null; statusText: string | null };
    expect(user.statusEmoji).toBe("🏠");
    expect(user.statusText).toBe("Working from home");

    // Verify via GET /me
    const meRes = await client.api.users.me.$get();
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { statusEmoji: string | null; statusText: string | null };
    expect(me.statusEmoji).toBe("🏠");
    expect(me.statusText).toBe("Working from home");
  });

  test("clear status and verify", async () => {
    // Set a status first
    await client.api.users.me.status.$put({
      json: { emoji: "🎉", text: "Celebrating", expiresAt: null },
    });

    // Clear it
    const clearRes = await client.api.users.me.status.$delete({});
    expect(clearRes.status).toBe(200);
    const data = (await clearRes.json()) as { ok: boolean };
    expect(data.ok).toBe(true);

    // Verify cleared
    const meRes = await client.api.users.me.$get();
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { statusEmoji: string | null; statusText: string | null };
    expect(me.statusEmoji).toBeNull();
    expect(me.statusText).toBeNull();
  });

  test("set status with expiresAt", async () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    const setRes = await client.api.users.me.status.$put({
      json: { emoji: "🍕", text: "Lunch", expiresAt },
    });
    expect(setRes.status).toBe(200);
    const user = (await setRes.json()) as { statusEmoji: string | null; statusExpiresAt: string | null };
    expect(user.statusEmoji).toBe("🍕");
    expect(user.statusExpiresAt).toBeTruthy();
  });
});
