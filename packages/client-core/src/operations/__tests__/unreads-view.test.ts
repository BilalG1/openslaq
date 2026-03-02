import { describe, expect, it } from "bun:test";
import type { AllUnreadsResponse } from "@openslaq/shared";
import { AuthError } from "../../api/errors";
import { initialState, type ChatAction } from "../../chat-reducer";
import { fetchAllUnreads, markAllAsRead } from "../unreads-view";
import type { OperationDeps } from "../types";

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeDeps(resolvers: {
  unreadsGet?: () => Promise<Response>;
  markAllReadPost?: () => Promise<Response>;
  authToken?: string;
}) {
  const actions: ChatAction[] = [];
  let authRequiredCount = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            unreads: {
              $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.unreadsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              "mark-all-read": {
                $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                  expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                  return (resolvers.markAllReadPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => initialState,
  };

  return { deps, actions, getAuthRequiredCount: () => authRequiredCount };
}

const sampleUnreads: AllUnreadsResponse = {
  channels: [
    { channelId: "ch-1" as never, channelName: "general", channelType: "public", messages: [] },
  ],
  threadMentions: [],
};

describe("operations/unreads-view", () => {
  describe("fetchAllUnreads", () => {
    it("returns unread data on success", async () => {
      const { deps } = makeDeps({
        unreadsGet: () => jsonResponse(sampleUnreads),
      });

      const result = await fetchAllUnreads(deps, { workspaceSlug: "ws" });

      expect(result).toEqual(sampleUnreads);
    });

    it("throws AuthError on 401", async () => {
      const { deps } = makeDeps({
        unreadsGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(fetchAllUnreads(deps, { workspaceSlug: "ws" })).rejects.toThrow(AuthError);
    });
  });

  describe("markAllAsRead", () => {
    it("dispatches unread/setCounts with empty counts on success", async () => {
      const { deps, actions } = makeDeps({
        markAllReadPost: () => jsonResponse({ ok: true }),
      });

      await markAllAsRead(deps, { workspaceSlug: "ws" });

      expect(actions).toEqual([{ type: "unread/setCounts", counts: {} }]);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, actions, getAuthRequiredCount } = makeDeps({
        markAllReadPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(markAllAsRead(deps, { workspaceSlug: "ws" })).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
      expect(actions).toEqual([]);
    });
  });
});
