import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import type { OperationDeps } from "../types";
import { pinMessage, unpinMessage, fetchPinnedMessages } from "../pins";

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeDeps(resolvers: {
  pinPost?: () => Promise<Response>;
  pinDelete?: () => Promise<Response>;
  pinsGet?: () => Promise<Response>;
}) {
  const actions: ChatAction[] = [];

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              ":id": {
                messages: {
                  ":messageId": {
                    pin: {
                      $post: () => (resolvers.pinPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                      $delete: () => (resolvers.pinDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                    },
                  },
                },
                pins: {
                  $get: () => (resolvers.pinsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
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

const params = { workspaceSlug: "ws", channelId: "ch-1", messageId: "msg-1" };

describe("operations/pins", () => {
  describe("pinMessage", () => {
    it("dispatches optimistic pin on success", async () => {
      const { deps, actions } = makeDeps({
        pinPost: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await pinMessage(deps, params);

      expect(actions).toEqual([
        { type: "messages/updatePinStatus", messageId: "msg-1", isPinned: true },
      ]);
    });

    it("rolls back to unpinned on failure", async () => {
      const { deps, actions } = makeDeps({
        pinPost: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await pinMessage(deps, params);

      expect(actions).toEqual([
        { type: "messages/updatePinStatus", messageId: "msg-1", isPinned: true },
        { type: "messages/updatePinStatus", messageId: "msg-1", isPinned: false },
      ]);
    });
  });

  describe("unpinMessage", () => {
    it("dispatches optimistic unpin on success", async () => {
      const { deps, actions } = makeDeps({
        pinDelete: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await unpinMessage(deps, params);

      expect(actions).toEqual([
        { type: "messages/updatePinStatus", messageId: "msg-1", isPinned: false },
      ]);
    });

    it("rolls back to pinned on failure", async () => {
      const { deps, actions } = makeDeps({
        pinDelete: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await unpinMessage(deps, params);

      expect(actions).toEqual([
        { type: "messages/updatePinStatus", messageId: "msg-1", isPinned: false },
        { type: "messages/updatePinStatus", messageId: "msg-1", isPinned: true },
      ]);
    });
  });

  describe("fetchPinnedMessages", () => {
    it("returns normalized pinned messages", async () => {
      const rawMessage = {
        id: "msg-1",
        channelId: "ch-1",
        userId: "u-1",
        content: "pinned message",
        parentMessageId: null,
        replyCount: 0,
        latestReplyAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      const { deps } = makeDeps({
        pinsGet: () => Promise.resolve(jsonResponse({ messages: [rawMessage] })),
      });

      const result = await fetchPinnedMessages(deps, { workspaceSlug: "ws", channelId: "ch-1" });

      expect(result).toHaveLength(1);
      expect(String(result[0]!.id)).toBe("msg-1");
      expect(result[0]!.content).toBe("pinned message");
    });
  });
});
