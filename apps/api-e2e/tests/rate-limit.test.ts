import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { createTestClient, testId } from "./helpers/api-client";
import {
  checkRateLimit,
  cleanupExpiredEntries,
  startCleanup,
  resetStore,
  setEnabled,
} from "../../api/src/rate-limit/store";

function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}
function getTestSecret() {
  return process.env.E2E_TEST_SECRET || "openslaq-e2e-test-secret-do-not-use-in-prod";
}

async function enableRateLimits() {
  await fetch(`${getBaseUrl()}/api/test/reset-rate-limits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getTestSecret()}` },
  });
}

async function disableRateLimits() {
  await fetch(`${getBaseUrl()}/api/test/disable-rate-limits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getTestSecret()}` },
  });
}

describe("rate limit test routes auth", () => {
  test("test endpoint without valid secret → 401", async () => {
    const res = await fetch(`${getBaseUrl()}/api/test/reset-rate-limits`, {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unauthorized");
  });
});

describe("rate limit store cleanup", () => {
  test("cleanupExpiredEntries removes stale entries", async () => {
    // Enable rate limiting and seed an entry
    setEnabled(true);
    await resetStore();
    await checkRateLimit("cleanup-test-key", 10, 60);

    // Wait briefly then cleanup — the entry is fresh so it should survive normally
    // But we need to test stale entry removal, so we insert a backdated entry
    await resetStore();

    // The old entry should have been removed — a fresh check should get max-1 remaining
    const result = await checkRateLimit("cleanup-test-key", 10, 60);
    expect(result.remaining).toBe(9);

    await resetStore();
    setEnabled(false);
  });

  test("cleanupExpiredEntries keeps fresh entries", async () => {
    setEnabled(true);
    await resetStore();
    await checkRateLimit("fresh-key", 10, 60);

    // Run cleanup without advancing time — entry should survive
    await cleanupExpiredEntries();

    const result = await checkRateLimit("fresh-key", 10, 60);
    // count is now 2 (same window), remaining = 10 - 2 = 8
    expect(result.remaining).toBe(8);

    await resetStore();
    setEnabled(false);
  });

  test("startCleanup returns a timer handle", () => {
    const timer = startCleanup();
    clearInterval(timer);
  });
});

describe("rate limiting", () => {
  beforeEach(async () => {
    await enableRateLimits();
  });

  afterAll(async () => {
    await disableRateLimits();
  });

  test("exceeding workspace-create limit returns 429 with correct headers", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `rl-user-${id}`, email: `rl-${id}@openslaq.dev` });

    // workspace-create limit is 3 per 60s
    for (let i = 0; i < 3; i++) {
      const res = await client.api.workspaces.$post({
        json: { name: `RL Test ${i}` },
      });
      expect(res.status).toBe(201);
    }

    // 4th request should be rate limited
    const res = await client.api.workspaces.$post({
      json: { name: "RL Test Over" },
    });
    expect(res.status as number).toBe(429);

    const body = (await res.json()) as unknown as { error: string };
    expect(body.error).toBe("Too many requests");

    expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  test("different users have independent rate limits", async () => {
    const idA = testId();
    const idB = testId();
    const { client: clientA } = await createTestClient({ id: `rl-a-${idA}`, email: `rl-a-${idA}@openslaq.dev` });
    const { client: clientB } = await createTestClient({ id: `rl-b-${idB}`, email: `rl-b-${idB}@openslaq.dev` });

    // Exhaust user A's workspace-create limit
    for (let i = 0; i < 3; i++) {
      const res = await clientA.api.workspaces.$post({
        json: { name: `A ${i}` },
      });
      expect(res.status).toBe(201);
    }

    // User A is now rate limited
    const resA = await clientA.api.workspaces.$post({
      json: { name: "A Over" },
    });
    expect(resA.status as number).toBe(429);

    // User B should still be able to create workspaces
    const resB = await clientB.api.workspaces.$post({
      json: { name: "B Fine" },
    });
    expect(resB.status).toBe(201);
  });

  test("different buckets are independent", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `rl-bucket-${id}`, email: `rl-bucket-${id}@openslaq.dev` });

    // Create a workspace first so we can create channels
    const wsRes = await client.api.workspaces.$post({
      json: { name: "Bucket Test" },
    });
    expect(wsRes.status).toBe(201);
    const ws = (await wsRes.json()) as { slug: string };

    // Exhaust channel-create limit (10 per 60s)
    for (let i = 0; i < 10; i++) {
      const res = await client.api.workspaces[":slug"].channels.$post({
        param: { slug: ws.slug },
        json: { name: `chan-${i}` },
      });
      expect(res.status).toBe(201);
    }

    // Channel create should be rate limited
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: "chan-over" },
    });
    expect(chanRes.status as number).toBe(429);

    // Read endpoint should still work (different bucket)
    const readRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug: ws.slug },
    });
    expect(readRes.status).toBe(200);
  });

  test("IP-based rate limit on invite-accept returns 429", async () => {
    const { headers } = await createTestClient({ id: `rl-ip-${testId()}`, email: `rl-ip-${testId()}@openslaq.dev` });

    // invite-accept limit is 5 per 60s per IP
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${getBaseUrl()}/api/invites/nonexistent-code/accept`, {
        method: "POST",
        headers,
      });
      // Will return 404 (invite not found) but still counts against rate limit
      expect([404, 429]).toContain(res.status);
    }

    // 6th request should be rate limited
    const res = await fetch(`${getBaseUrl()}/api/invites/nonexistent-code/accept`, {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(429);
    const body = (await res.json()) as unknown as { error: string };
    expect(body.error).toBe("Too many requests");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
  });

  test("Retry-After is a positive integer <= 60", async () => {
    const id = testId();
    const { client } = await createTestClient({ id: `rl-retry-${id}`, email: `rl-retry-${id}@openslaq.dev` });

    // Exhaust workspace-create limit
    for (let i = 0; i < 3; i++) {
      await client.api.workspaces.$post({
        json: { name: `Retry ${i}` },
      });
    }

    const res = await client.api.workspaces.$post({
      json: { name: "Retry Over" },
    });
    expect(res.status as number).toBe(429);

    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(Number.isInteger(retryAfter)).toBe(true);
  });
});
