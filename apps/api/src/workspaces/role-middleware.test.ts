import { describe, test, expect, mock } from "bun:test";
import { Hono } from "hono";

// Mock db before importing middleware
const mockSelect = mock(() => ({
  from: mock(() => ({
    where: mock(() => ({
      limit: mock(() => []), // empty = not a member
    })),
  })),
}));

mock.module("../db", () => ({
  db: {
    select: mockSelect,
  },
}));

mock.module("./schema", () => ({
  workspaceMembers: {
    workspaceId: "workspaceId",
    userId: "userId",
    role: "role",
  },
}));

mock.module("../auth/permissions", () => ({
  hasMinimumRole: () => true,
}));

const { resolveMemberRole } = await import("./role-middleware");

describe("resolveMemberRole", () => {
  function createApp(dbResult: unknown[]) {
    // Override the mock to return specific results
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => dbResult,
        }),
      }),
    } as never);

    const app = new Hono();
    // Simulate workspace and user being set by prior middleware
    app.use("*", async (c, next) => {
      c.set("workspace" as never, { id: "ws-1" } as never);
      c.set("user" as never, { id: "user-1" } as never);
      await next();
    });
    app.use("*", resolveMemberRole);
    app.get("/test", (c) => c.json({ ok: true }));
    return app;
  }

  test("returns 404 (not 403) when user is not a workspace member", async () => {
    const app = createApp([]); // no membership row
    const res = await app.request("/test");
    // Should return 404 to prevent workspace enumeration
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Workspace not found");
  });

  test("allows access when user is a workspace member", async () => {
    const app = createApp([{ role: "member" }]);
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});
