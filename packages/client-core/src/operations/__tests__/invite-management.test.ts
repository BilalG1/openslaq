import { describe, expect, it } from "bun:test";
import type { WorkspaceId, UserId } from "@openslaq/shared";
import { AuthError } from "../../api/errors";
import { listInvites, createInvite, revokeInvite } from "../invite-management";
import type { ApiDeps } from "../types";

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeApiDeps(resolvers: {
  invitesGet?: () => Promise<Response>;
  invitesPost?: () => Promise<Response>;
  inviteDelete?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            invites: {
              $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.invitesGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.invitesPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              ":inviteId": {
                $delete: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                  expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                  return (resolvers.inviteDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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

const sampleInvite = {
  id: "inv-1",
  workspaceId: "ws-1" as WorkspaceId,
  code: "abc123",
  createdBy: "u-1" as UserId,
  maxUses: null,
  useCount: 0,
  expiresAt: "2026-03-01T00:00:00.000Z",
  revokedAt: null,
  createdAt: "2026-02-20T00:00:00.000Z",
};

describe("operations/invite-management", () => {
  describe("listInvites", () => {
    it("returns invites on success", async () => {
      const { deps } = makeApiDeps({
        invitesGet: () => jsonResponse([sampleInvite]),
      });

      const result = await listInvites(deps, "ws");

      expect(result).toEqual([sampleInvite]);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        invitesGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(listInvites(deps, "ws")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("createInvite", () => {
    it("returns created invite on success", async () => {
      const { deps } = makeApiDeps({
        invitesPost: () => jsonResponse(sampleInvite, 201),
      });

      const result = await createInvite(deps, "ws", { expiresInHours: 48 });

      expect(result).toEqual(sampleInvite);
    });

    it("works with no options", async () => {
      const { deps } = makeApiDeps({
        invitesPost: () => jsonResponse(sampleInvite, 201),
      });

      const result = await createInvite(deps, "ws");

      expect(result).toEqual(sampleInvite);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        invitesPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(createInvite(deps, "ws")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("revokeInvite", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        inviteDelete: () => jsonResponse({ ok: true }),
      });

      await expect(revokeInvite(deps, "ws", "inv-1")).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and returns on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        inviteDelete: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(revokeInvite(deps, "ws", "inv-1")).resolves.toBeUndefined();
      expect(getAuthRequiredCount()).toBe(1);
    });
  });
});
