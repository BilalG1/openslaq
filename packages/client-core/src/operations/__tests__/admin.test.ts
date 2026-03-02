import { describe, expect, it } from "bun:test";
import { AuthError } from "../../api/errors";
import { checkAdmin, getStats, getActivity, getUsers, getWorkspaces, impersonate } from "../admin";
import type { ApiDeps } from "../types";

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeApiDeps(resolvers: {
  checkGet?: () => Promise<Response>;
  statsGet?: () => Promise<Response>;
  activityGet?: () => Promise<Response>;
  usersGet?: () => Promise<Response>;
  workspacesGet?: () => Promise<Response>;
  impersonatePost?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        admin: {
          check: {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.checkGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
          },
          stats: {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.statsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
          },
          activity: {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.activityGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
          },
          users: {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.usersGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
          },
          workspaces: {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.workspacesGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
          },
          impersonate: {
            ":userId": {
              $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.impersonatePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => resolvers.authToken ?? "token",
      requireAccessToken: async () => resolvers.authToken ?? "token",
      onAuthRequired: () => {
        authRequiredCount += 1;
      },
    },
  };

  return { deps, getAuthRequiredCount: () => authRequiredCount };
}

describe("operations/admin", () => {
  describe("checkAdmin", () => {
    it("returns isAdmin flag on success", async () => {
      const { deps } = makeApiDeps({
        checkGet: () => jsonResponse({ isAdmin: true }),
      });

      const result = await checkAdmin(deps);

      expect(result).toEqual({ isAdmin: true });
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        checkGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(checkAdmin(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("getStats", () => {
    it("returns stats on success", async () => {
      const stats = { users: 10, workspaces: 2, channels: 5, messages: 100, attachments: 3, reactions: 50 };
      const { deps } = makeApiDeps({
        statsGet: () => jsonResponse(stats),
      });

      const result = await getStats(deps);

      expect(result).toEqual(stats);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        statsGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(getStats(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("getActivity", () => {
    it("returns activity data on success", async () => {
      const activity = {
        messagesPerDay: [{ date: "2026-01-01", count: 10 }],
        usersPerDay: [{ date: "2026-01-01", count: 3 }],
      };
      const { deps } = makeApiDeps({
        activityGet: () => jsonResponse(activity),
      });

      const result = await getActivity(deps);

      expect(result).toEqual(activity);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        activityGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(getActivity(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("getUsers", () => {
    it("returns paginated users on success", async () => {
      const data = {
        users: [{ id: "u-1", displayName: "Alice", email: "a@b.com", avatarUrl: null, lastSeenAt: null, createdAt: "2026-01-01T00:00:00Z", messageCount: 5, workspaceCount: 1 }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      const { deps } = makeApiDeps({
        usersGet: () => jsonResponse(data),
      });

      const result = await getUsers(deps);

      expect(result).toEqual(data);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        usersGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(getUsers(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("getWorkspaces", () => {
    it("returns paginated workspaces on success", async () => {
      const data = {
        workspaces: [{ id: "ws-1", name: "Test", slug: "test", createdAt: "2026-01-01T00:00:00Z", memberCount: 3, channelCount: 2, messageCount: 50 }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      const { deps } = makeApiDeps({
        workspacesGet: () => jsonResponse(data),
      });

      const result = await getWorkspaces(deps);

      expect(result).toEqual(data);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        workspacesGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(getWorkspaces(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("impersonate", () => {
    it("returns snippet on success", async () => {
      const { deps } = makeApiDeps({
        impersonatePost: () => jsonResponse({ snippet: "js-code-snippet" }),
      });

      const result = await impersonate(deps, "u-1");

      expect(result).toEqual({ snippet: "js-code-snippet" });
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        impersonatePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(impersonate(deps, "u-1")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });
});
