import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestClient,
  testId,
} from "../helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("api-keys command (integration)", () => {
  let client: Client;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `cli-ak-${testId()}`,
      displayName: "CLI API Keys User",
      email: `cli-ak-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
  });

  test("create key with valid scopes", async () => {
    const res = await client.api["api-keys"].$post({
      json: {
        name: `test-key-${testId()}`,
        scopes: ["chat:read", "chat:write"],
      },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { token: string; tokenPrefix: string; name: string; scopes: string[] };
    expect(data.token).toBeTruthy();
    expect(data.tokenPrefix).toBeTruthy();
    expect(data.name).toContain("test-key-");
    expect(data.scopes).toContain("chat:read");
    expect(data.scopes).toContain("chat:write");
  });

  test("list keys includes created key", async () => {
    const name = `list-test-${testId()}`;
    await client.api["api-keys"].$post({
      json: { name, scopes: ["users:read"] },
    });

    const res = await client.api["api-keys"].$get();
    expect(res.status).toBe(200);
    const data = (await res.json()) as { keys: { id: string; name: string; scopes: string[] }[] };
    const found = data.keys.find((k) => k.name === name);
    expect(found).toBeDefined();
  });

  test("get key by ID", async () => {
    const name = `get-test-${testId()}`;
    const createRes = await client.api["api-keys"].$post({
      json: { name, scopes: ["channels:read"] },
    });
    const created = (await createRes.json()) as { id: string };

    const res = await client.api["api-keys"][":id"].$get({
      param: { id: created.id },
    });
    expect(res.status).toBe(200);
    const key = (await res.json()) as { name: string; scopes: string[] };
    expect(key.name).toBe(name);
    expect(key.scopes).toContain("channels:read");
  });

  test("update key name and scopes", async () => {
    const createRes = await client.api["api-keys"].$post({
      json: { name: `upd-orig-${testId()}`, scopes: ["chat:read"] },
    });
    const created = (await createRes.json()) as { id: string };

    const newName = `upd-new-${testId()}`;
    const res = await client.api["api-keys"][":id"].$patch({
      param: { id: created.id },
      json: { name: newName, scopes: ["chat:write", "users:read"] },
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { name: string; scopes: string[] };
    expect(updated.name).toBe(newName);
    expect(updated.scopes).toContain("chat:write");
    expect(updated.scopes).toContain("users:read");
  });

  test("delete key", async () => {
    const createRes = await client.api["api-keys"].$post({
      json: { name: `del-test-${testId()}`, scopes: ["chat:read"] },
    });
    const created = (await createRes.json()) as { id: string };

    const delRes = await client.api["api-keys"][":id"].$delete({
      param: { id: created.id },
    });
    expect(delRes.status).toBe(200);

    // Verify no longer in list
    const listRes = await client.api["api-keys"].$get();
    const data = (await listRes.json()) as { keys: { id: string; name: string }[] };
    const found = data.keys.find((k) => k.id === created.id);
    expect(found).toBeUndefined();
  });

  test("get nonexistent ID returns 404", async () => {
    const res = await client.api["api-keys"][":id"].$get({
      param: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });
});
