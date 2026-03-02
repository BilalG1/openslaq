import { describe, expect, it } from "bun:test";
import { AuthError } from "../../api/errors";
import { getInvite, acceptInvite } from "../invites";
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
  inviteGet?: () => Promise<Response>;
  acceptPost?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        invites: {
          ":code": {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.inviteGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
            accept: {
              $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.acceptPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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

describe("operations/invites", () => {
  describe("getInvite", () => {
    it("returns invite data on success", async () => {
      const { deps } = makeApiDeps({
        inviteGet: () => jsonResponse({ workspaceName: "My Workspace", workspaceSlug: "my-ws" }),
      });

      const result = await getInvite(deps, "abc123");

      expect(result).toEqual({ workspaceName: "My Workspace", workspaceSlug: "my-ws" });
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        inviteGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(getInvite(deps, "abc123")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("acceptInvite", () => {
    it("returns slug on success", async () => {
      const { deps } = makeApiDeps({
        acceptPost: () => jsonResponse({ slug: "my-ws" }),
      });

      const result = await acceptInvite(deps, "abc123");

      expect(result).toEqual({ slug: "my-ws" });
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        acceptPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(acceptInvite(deps, "abc123")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });
});
