import { describe, expect, it } from "bun:test";
import { AuthError } from "../../api/errors";
import { getCurrentUser, updateCurrentUser, setUserStatus, clearUserStatus } from "../user-profile";
import type { ApiDeps } from "../types";

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

const sampleUser = {
  id: "u-1",
  displayName: "Alice",
  email: "alice@example.com",
  avatarUrl: null,
  statusEmoji: null,
  statusText: null,
  statusExpiresAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function makeApiDeps(resolvers: {
  meGet?: () => Promise<Response>;
  mePatch?: () => Promise<Response>;
  statusPut?: () => Promise<Response>;
  statusDelete?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        users: {
          me: {
            $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.meGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
            $patch: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
              expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
              return (resolvers.mePatch ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
            },
            status: {
              $put: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.statusPut ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              $delete: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.statusDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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

describe("operations/user-profile", () => {
  describe("getCurrentUser", () => {
    it("returns user profile on success", async () => {
      const { deps } = makeApiDeps({
        meGet: () => jsonResponse(sampleUser),
      });

      const result = await getCurrentUser(deps);

      expect(result).toEqual(sampleUser);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        meGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(getCurrentUser(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("updateCurrentUser", () => {
    it("returns updated profile on success", async () => {
      const updated = { ...sampleUser, displayName: "Alice B" };
      const { deps } = makeApiDeps({
        mePatch: () => jsonResponse(updated),
      });

      const result = await updateCurrentUser(deps, { displayName: "Alice B" });

      expect(result.displayName).toBe("Alice B");
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        mePatch: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(updateCurrentUser(deps, { displayName: "X" })).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("setUserStatus", () => {
    it("returns updated profile with status on success", async () => {
      const withStatus = { ...sampleUser, statusEmoji: ":wave:", statusText: "Hello" };
      const { deps } = makeApiDeps({
        statusPut: () => jsonResponse(withStatus),
      });

      const result = await setUserStatus(deps, { emoji: ":wave:", text: "Hello" });

      expect(result.statusEmoji).toBe(":wave:");
      expect(result.statusText).toBe("Hello");
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        statusPut: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(setUserStatus(deps, { emoji: ":wave:" })).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("clearUserStatus", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        statusDelete: () => jsonResponse({ ok: true }),
      });

      await expect(clearUserStatus(deps)).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        statusDelete: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(clearUserStatus(deps)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });
});
