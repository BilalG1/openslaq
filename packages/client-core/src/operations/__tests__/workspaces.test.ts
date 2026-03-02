import { describe, expect, it } from "bun:test";
import type { WorkspaceId } from "@openslaq/shared";
import { AuthError } from "../../api/errors";
import { listWorkspaces, createWorkspace } from "../workspaces";
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
  workspacesGet?: () => Promise<Response>;
  workspacesPost?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        workspaces: {
          $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
            expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
            return (resolvers.workspacesGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
          },
          $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
            expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
            return (resolvers.workspacesPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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

const sampleWorkspace = {
  id: "ws-1" as WorkspaceId,
  name: "Test Workspace",
  slug: "test-ws",
  createdAt: "2026-01-01T00:00:00Z",
  role: "admin" as const,
  memberCount: 5,
};

describe("operations/workspaces", () => {
  describe("listWorkspaces", () => {
    it("returns workspace list on success", async () => {
      const { deps } = makeApiDeps({
        workspacesGet: () => jsonResponse([sampleWorkspace]),
      });

      const result = await listWorkspaces(deps);

      expect(result).toEqual([sampleWorkspace]);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        workspacesGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(listWorkspaces(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("createWorkspace", () => {
    it("returns ok with slug on success", async () => {
      const { deps } = makeApiDeps({
        workspacesPost: () => jsonResponse({ slug: "new-ws" }),
      });

      const result = await createWorkspace(deps, "New Workspace");

      expect(result).toEqual({ ok: true, slug: "new-ws" });
    });

    it("returns ok false with auth error message on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        workspacesPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      const result = await createWorkspace(deps, "New Workspace");

      expect(result).toEqual({ ok: false, error: "Authentication required" });
      expect(getAuthRequiredCount()).toBe(1);
    });

    it("returns ok false with error message for non-auth errors", async () => {
      const { deps } = makeApiDeps({
        workspacesPost: () => Promise.resolve(new Response(JSON.stringify({ error: "Name taken" }), { status: 409 })),
      });

      const result = await createWorkspace(deps, "Taken Name");

      expect(result).toEqual({ ok: false, error: "Name taken" });
    });
  });
});
