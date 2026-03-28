import { describe, expect, it } from "bun:test";
import { AuthError } from "../../api/errors";
import { listWorkspaceMembers, updateMemberRole, removeMember, deleteWorkspace } from "../members";
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
  membersGet?: () => Promise<Response>;
  rolePatch?: () => Promise<Response>;
  memberDelete?: () => Promise<Response>;
  workspaceDelete?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            $delete: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.workspaceDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
            members: {
              $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.membersGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              ":userId": {
                $delete: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                  expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                  return (resolvers.memberDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                },
                role: {
                  $patch: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.rolePatch ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                  },
                },
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

const sampleMember = {
  id: "u-1",
  displayName: "Alice",
  email: "alice@example.com",
  avatarUrl: null,
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  joinedAt: "2026-01-15T00:00:00.000Z",
};

describe("operations/members", () => {
  describe("listWorkspaceMembers", () => {
    it("returns members on success", async () => {
      const { deps } = makeApiDeps({
        membersGet: () => jsonResponse([sampleMember]),
      });

      const result = await listWorkspaceMembers(deps, "ws");

      expect(result).toEqual([sampleMember]);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        membersGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(listWorkspaceMembers(deps, "ws")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("updateMemberRole", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        rolePatch: () => jsonResponse({ ok: true }),
      });

      await expect(updateMemberRole(deps, "ws", "u-1", "admin")).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and throws on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        rolePatch: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(updateMemberRole(deps, "ws", "u-1", "admin")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("removeMember", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        memberDelete: () => jsonResponse({ ok: true }),
      });

      await expect(removeMember(deps, "ws", "u-1")).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and throws on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        memberDelete: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(removeMember(deps, "ws", "u-1")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("deleteWorkspace", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        workspaceDelete: () => jsonResponse({ ok: true }),
      });

      await expect(deleteWorkspace(deps, "ws")).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and throws on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        workspaceDelete: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(deleteWorkspace(deps, "ws")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });
});
