import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import type { OperationDeps } from "../types";
import { fetchStarredChannels, starChannel, unstarChannel } from "../stars";

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeDeps(resolvers: {
  starredGet?: () => Promise<Response>;
  starPost?: () => Promise<Response>;
  starDelete?: () => Promise<Response>;
}) {
  const actions: ChatAction[] = [];

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              starred: {
                $get: () => (resolvers.starredGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
              },
              ":id": {
                star: {
                  $post: () => (resolvers.starPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                  $delete: () => (resolvers.starDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                },
              },
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: () => {},
    },
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => initialState,
  };

  return { deps, actions };
}

describe("operations/stars", () => {
  describe("fetchStarredChannels", () => {
    it("dispatches stars/set with channel IDs", async () => {
      const { deps, actions } = makeDeps({
        starredGet: () => Promise.resolve(jsonResponse(["ch-1", "ch-2"])),
      });

      const result = await fetchStarredChannels(deps, "ws");

      expect(result).toEqual(["ch-1", "ch-2"]);
      expect(actions).toEqual([{ type: "stars/set", channelIds: ["ch-1", "ch-2"] }]);
    });
  });

  describe("starChannel", () => {
    it("dispatches optimistic add on success", async () => {
      const { deps, actions } = makeDeps({
        starPost: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await starChannel(deps, { slug: "ws", channelId: "ch-1" });

      expect(actions).toEqual([{ type: "stars/add", channelId: "ch-1" }]);
    });

    it("rolls back with remove on failure", async () => {
      const { deps, actions } = makeDeps({
        starPost: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await starChannel(deps, { slug: "ws", channelId: "ch-1" });

      expect(actions).toEqual([
        { type: "stars/add", channelId: "ch-1" },
        { type: "stars/remove", channelId: "ch-1" },
      ]);
    });
  });

  describe("unstarChannel", () => {
    it("dispatches optimistic remove on success", async () => {
      const { deps, actions } = makeDeps({
        starDelete: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await unstarChannel(deps, { slug: "ws", channelId: "ch-1" });

      expect(actions).toEqual([{ type: "stars/remove", channelId: "ch-1" }]);
    });

    it("rolls back with add on failure", async () => {
      const { deps, actions } = makeDeps({
        starDelete: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await unstarChannel(deps, { slug: "ws", channelId: "ch-1" });

      expect(actions).toEqual([
        { type: "stars/remove", channelId: "ch-1" },
        { type: "stars/add", channelId: "ch-1" },
      ]);
    });
  });
});
