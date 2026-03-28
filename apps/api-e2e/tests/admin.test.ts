import { describe, test, expect } from "bun:test";
import { createTestClient, testId } from "./helpers/api-client";

// Admin client always uses the same id and email to avoid unique constraint issues
const ADMIN_USER = {
  id: "admin-test-user",
  email: "admin-test@openslaq.dev",
  displayName: "Admin Test User",
};

describe("admin", () => {
  test("/check returns isAdmin: false for normal user", async () => {
    const id = testId();
    const { client } = await createTestClient({
      id: `non-admin-${id}`,
      email: `non-admin-${id}@openslaq.dev`,
    });
    const res = await client.api.admin.check.$get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { isAdmin: boolean };
    expect(body.isAdmin).toBe(false);
  });

  test("/check returns isAdmin: true for admin user", async () => {
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.check.$get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { isAdmin: boolean };
    expect(body.isAdmin).toBe(true);
  });

  test("/stats returns 403 for non-admin", async () => {
    const id = testId();
    const { client } = await createTestClient({
      id: `non-admin-stats-${id}`,
      email: `non-admin-stats-${id}@openslaq.dev`,
    });
    const res = await client.api.admin.stats.$get();
    expect(res.status).toBe(403);
  });

  test("/stats returns 200 with numeric fields for admin", async () => {
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.stats.$get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, number>;
    expect(typeof body.users).toBe("number");
    expect(typeof body.workspaces).toBe("number");
    expect(typeof body.channels).toBe("number");
    expect(typeof body.messages).toBe("number");
    expect(typeof body.attachments).toBe("number");
    expect(typeof body.reactions).toBe("number");
  });

  test("/activity returns arrays of { date, count }", async () => {
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.activity.$get({ query: { days: "7" } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      messagesPerDay: { date: string; count: number }[];
      usersPerDay: { date: string; count: number }[];
    };
    expect(Array.isArray(body.messagesPerDay)).toBe(true);
    expect(Array.isArray(body.usersPerDay)).toBe(true);
  });

  test("/users returns paginated results", async () => {
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.users.$get({
      query: { page: "1", pageSize: "5" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      users: { id: string; displayName: string }[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
    expect(Array.isArray(body.users)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(5);
  });

  test("/users search filtering works", async () => {
    const uniqueName = `admin-search-${testId()}`;

    // Create the searchable user and make an API call to trigger upsert
    const { client: searchableClient } = await createTestClient({
      id: `searchable-${testId()}`,
      email: `${uniqueName}-target@openslaq.dev`,
      displayName: `Searchable ${uniqueName}`,
    });
    // Trigger auth middleware to upsert the user
    await searchableClient.api.users.me.$get();

    // Use admin client to search
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.users.$get({
      query: { search: uniqueName },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      users: { displayName: string; email: string }[];
      total: number;
    };
    expect(body.total).toBeGreaterThan(0);
    const allMatch = body.users.every(
      (u) =>
        u.displayName.includes(uniqueName) || u.email.includes(uniqueName),
    );
    expect(allMatch).toBe(true);
  });

  test("/workspaces returns paginated results", async () => {
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.workspaces.$get({
      query: { page: "1", pageSize: "5" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      workspaces: { id: string; name: string }[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
    expect(Array.isArray(body.workspaces)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("/workspaces search filtering works", async () => {
    const { client } = await createTestClient(ADMIN_USER);

    // Create a workspace with a unique name
    const uniqueName = `Admin Search ${testId()}`;
    const createRes = await client.api.workspaces.$post({
      json: { name: uniqueName },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { slug: string };

    const res = await client.api.admin.workspaces.$get({
      query: { search: created.slug },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      workspaces: { slug: string }[];
      total: number;
    };
    expect(body.total).toBeGreaterThan(0);
    const found = body.workspaces.find((w) => w.slug === created.slug);
    expect(found).toBeDefined();
  });

  test("/impersonate/:userId returns 500 for nonexistent user", async () => {
    const { client } = await createTestClient(ADMIN_USER);
    const res = await client.api.admin.impersonate[":userId"].$post({
      param: { userId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as unknown as { error: string };
    expect(typeof body.error).toBe("string");
  });

  test("/impersonate returns 503 when STACK_SECRET_SERVER_KEY not set", async () => {
    const { env } = await import("../../api/src/env");
    const original = env.STACK_SECRET_SERVER_KEY;
    env.STACK_SECRET_SERVER_KEY = undefined;
    try {
      const { client } = await createTestClient(ADMIN_USER);
      const res = await client.api.admin.impersonate[":userId"].$post({
        param: { userId: "test-user" },
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as unknown as { error: string };
      expect(body.error).toContain("unavailable");
    } finally {
      env.STACK_SECRET_SERVER_KEY = original;
    }
  });
});
