import { describe, expect, it } from "bun:test";
import { searchMessages } from "../search";
import type { ApiDeps } from "../types";

function makeDeps(resolver: (query: Record<string, unknown>) => Promise<Response>) {
  let authRequired = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            search: {
              $get: ({ query }: { query: Record<string, unknown> }) => resolver(query),
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: () => {
        authRequired += 1;
      },
    },
  };

  return { deps, getAuthRequired: () => authRequired };
}

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("operations/search", () => {
  it("builds query with optional filters only when provided", async () => {
    const { deps } = makeDeps((query) => {
      expect(query).toEqual({
        q: "deploy",
        offset: 20,
        limit: 10,
        channelId: "ch-1",
        userId: "u-2",
        fromDate: "2026-01-01T00:00:00.000Z",
        toDate: "2026-01-31T23:59:59.999Z",
      });
      return jsonResponse(200, { results: [], total: 0 });
    });

    const result = await searchMessages(deps, {
      workspaceSlug: "ws",
      q: "deploy",
      offset: 20,
      limit: 10,
      channelId: "ch-1",
      userId: "u-2",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
    });

    expect(result).toEqual({ results: [], total: 0 });
  });

  it("passes through dates that are already full ISO datetimes", async () => {
    const { deps } = makeDeps((query) => {
      expect(query).toEqual({
        q: "test",
        offset: 0,
        limit: 10,
        fromDate: "2026-03-01T12:00:00.000Z",
        toDate: "2026-03-31T18:30:00.000Z",
      });
      return jsonResponse(200, { results: [], total: 0 });
    });

    await searchMessages(deps, {
      workspaceSlug: "ws",
      q: "test",
      offset: 0,
      limit: 10,
      fromDate: "2026-03-01T12:00:00.000Z",
      toDate: "2026-03-31T18:30:00.000Z",
    });
  });

  it("omits optional filters when not provided", async () => {
    const { deps } = makeDeps((query) => {
      expect(query).toEqual({ q: "hello", offset: 0, limit: 25 });
      return jsonResponse(200, { results: [{ id: "1" }], total: 1 });
    });

    await searchMessages(deps, {
      workspaceSlug: "ws",
      q: "hello",
      offset: 0,
      limit: 25,
    });
  });

  it("triggers auth callback on 401", async () => {
    const { deps, getAuthRequired } = makeDeps(() => Promise.resolve(new Response(null, { status: 401 })));

    await expect(
      searchMessages(deps, {
        workspaceSlug: "ws",
        q: "hello",
        offset: 0,
        limit: 25,
      }),
    ).rejects.toThrow();

    expect(getAuthRequired()).toBe(1);
  });
});
