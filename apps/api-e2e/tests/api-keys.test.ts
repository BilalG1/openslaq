import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, testId, getBaseUrl } from "./helpers/api-client";

describe("user API keys", () => {
  let headers: Record<string, string>;

  beforeAll(async () => {
    const id = testId();
    ({ headers } = await createTestClient({
      id: `apikey-${id}`,
      email: `apikey-${id}@openslaq.dev`,
    }));
  });

  async function createKey(opts?: { name?: string; scopes?: string[]; expiresAt?: string }) {
    const res = await fetch(`${getBaseUrl()}/api/api-keys`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opts?.name ?? `Key ${testId()}`,
        scopes: opts?.scopes ?? ["chat:read", "channels:read"],
        ...(opts?.expiresAt ? { expiresAt: opts.expiresAt } : {}),
      }),
    });
    return res;
  }

  test("create key → 201 with token", async () => {
    const res = await createKey({ name: "My CLI key" });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string; name: string; token: string; tokenPrefix: string; scopes: string[]; createdAt: string; expiresAt?: string };
    expect(data.id).toBeDefined();
    expect(data.name).toBe("My CLI key");
    expect(data.token).toMatch(/^osk_/);
    expect(data.tokenPrefix).toMatch(/^osk_.{8}$/);
    expect(data.scopes).toEqual(["chat:read", "channels:read"]);
    expect(data.createdAt).toBeDefined();
  });

  test("create key with expiration → expiresAt persisted", async () => {
    const expiresAt = "2026-06-01T00:00:00Z";
    const res = await createKey({ expiresAt });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { expiresAt: string };
    expect(data.expiresAt).toBe(new Date(expiresAt).toISOString());
  });

  test("create key — name required → 400", async () => {
    const res = await fetch(`${getBaseUrl()}/api/api-keys`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ scopes: ["chat:read"] }),
    });
    expect(res.status).toBe(400);
  });

  test("list keys → returns all keys for user, no token field", async () => {
    // Create a key first to ensure at least one exists
    await createKey({ name: "List Test Key" });

    const res = await fetch(`${getBaseUrl()}/api/api-keys`, {
      headers,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { keys: Array<{ id: string; name: string; token?: string; tokenPrefix: string }> };
    expect(data.keys.length).toBeGreaterThanOrEqual(1);

    const key = data.keys.find((k: { name: string; token?: string; tokenPrefix?: string }) => k.name === "List Test Key");
    expect(key).toBeDefined();
    expect(key!.token).toBeUndefined();
    expect(key!.tokenPrefix).toMatch(/^osk_/);
  });

  test("list keys — isolation: user A can't see user B's keys", async () => {
    const idB = testId();
    const { headers: headersB } = await createTestClient({
      id: `apikey-b-${idB}`,
      email: `apikey-b-${idB}@openslaq.dev`,
    });

    // Create a key as user B
    await fetch(`${getBaseUrl()}/api/api-keys`, {
      method: "POST",
      headers: { ...headersB, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "User B Secret Key",
        scopes: ["chat:read"],
      }),
    });

    // List as user A — should not see user B's key
    const res = await fetch(`${getBaseUrl()}/api/api-keys`, { headers });
    const data = (await res.json()) as { keys: Array<{ name: string }> };
    const found = data.keys.find((k: { name: string; token?: string; tokenPrefix?: string }) => k.name === "User B Secret Key");
    expect(found).toBeUndefined();
  });

  test("get single key → returns metadata, no token", async () => {
    const createRes = await createKey({ name: "Get Test Key" });
    const created = (await createRes.json()) as { id: string; token?: string };

    const res = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      headers,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: string; name: string; token: string; tokenPrefix: string; scopes: string[]; createdAt: string; expiresAt?: string };
    expect(data.id).toBe(created.id);
    expect(data.name).toBe("Get Test Key");
    expect(data.token).toBeUndefined();
  });

  test("get key — wrong user → 404", async () => {
    const createRes = await createKey({ name: "Wrong User Key" });
    const created = (await createRes.json()) as { id: string; token?: string };

    const idOther = testId();
    const { headers: otherHeaders } = await createTestClient({
      id: `apikey-other-${idOther}`,
      email: `apikey-other-${idOther}@openslaq.dev`,
    });

    const res = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      headers: otherHeaders,
    });
    expect(res.status).toBe(404);
  });

  test("update key name → changes name, scopes unchanged", async () => {
    const createRes = await createKey({
      name: "Original Name",
      scopes: ["chat:read", "channels:read"],
    });
    const created = (await createRes.json()) as { id: string; token?: string };

    const res = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string; scopes: string[] };
    expect(data.name).toBe("Updated Name");
    expect(data.scopes).toEqual(["chat:read", "channels:read"]);
  });

  test("update key scopes → changes scopes", async () => {
    const createRes = await createKey({ scopes: ["chat:read"] });
    const created = (await createRes.json()) as { id: string; token?: string };

    const res = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ scopes: ["chat:write", "users:read"] }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { scopes: string[] };
    expect(data.scopes).toEqual(["chat:write", "users:read"]);
  });

  test("delete key → 200, key no longer in list", async () => {
    const createRes = await createKey({ name: "To Delete" });
    const created = (await createRes.json()) as { id: string; token?: string };

    const deleteRes = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      method: "DELETE",
      headers,
    });
    expect(deleteRes.status).toBe(200);
    const deleteData = (await deleteRes.json()) as { ok: boolean };
    expect(deleteData.ok).toBe(true);

    // Verify it's gone
    const getRes = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      headers,
    });
    expect(getRes.status).toBe(404);
  });

  test("delete key — wrong user → 404", async () => {
    const createRes = await createKey({ name: "Not Yours" });
    const created = (await createRes.json()) as { id: string; token?: string };

    const idOther = testId();
    const { headers: otherHeaders } = await createTestClient({
      id: `apikey-del-${idOther}`,
      email: `apikey-del-${idOther}@openslaq.dev`,
    });

    const res = await fetch(`${getBaseUrl()}/api/api-keys/${created.id}`, {
      method: "DELETE",
      headers: otherHeaders,
    });
    expect(res.status).toBe(404);
  });

  test("token starts with osk_", async () => {
    const res = await createKey();
    const data = (await res.json()) as { token: string; tokenPrefix: string };
    expect(data.token.startsWith("osk_")).toBe(true);
    expect(data.tokenPrefix.startsWith("osk_")).toBe(true);
    expect(data.tokenPrefix.length).toBe(12); // "osk_" + 8 chars
  });

  // ── API key authentication ──────────────────────────────────────────

  test("authenticate with API key → can call /api/users/me", async () => {
    const res = await createKey({ name: "Auth Test Key", scopes: ["users:read"] });
    const { token } = (await res.json()) as { token: string };

    const meRes = await fetch(`${getBaseUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { email: string };
    expect(me.email).toContain("apikey-");
  });

  test("authenticate with expired API key → 401", async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    const res = await createKey({ name: "Expired Key", expiresAt: pastDate });
    const { token } = (await res.json()) as { token: string };

    const meRes = await fetch(`${getBaseUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(401);
  });

  test("authenticate with deleted API key → 401", async () => {
    const res = await createKey({ name: "Deleted Key" });
    const { id, token } = (await res.json()) as { id: string; token: string };

    // Delete the key
    await fetch(`${getBaseUrl()}/api/api-keys/${id}`, {
      method: "DELETE",
      headers,
    });

    const meRes = await fetch(`${getBaseUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(401);
  });

  test("authenticate with invalid osk_ token → 401", async () => {
    const meRes = await fetch(`${getBaseUrl()}/api/users/me`, {
      headers: { Authorization: "Bearer osk_bogus_token_value" },
    });
    expect(meRes.status).toBe(401);
  });
});
