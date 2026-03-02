import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import type { OperationDeps } from "../types";
import { saveMessageOp, unsaveMessageOp, fetchSavedMessages, fetchSavedMessageIds } from "../saved";

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeDeps(resolvers: {
  savePost?: () => Promise<Response>;
  saveDelete?: () => Promise<Response>;
  savedMessagesGet?: () => Promise<Response>;
  savedIdsGet?: () => Promise<Response>;
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
                    save: {
                      $post: () => (resolvers.savePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                      $delete: () => (resolvers.saveDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                    },
                  },
                },
              },
            },
            "saved-messages": {
              $get: () => (resolvers.savedMessagesGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
              ids: {
                $get: () => (resolvers.savedIdsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
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

describe("operations/saved", () => {
  describe("saveMessageOp", () => {
    it("dispatches optimistic add on success", async () => {
      const { deps, actions } = makeDeps({
        savePost: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await saveMessageOp(deps, params);

      expect(actions).toEqual([{ type: "saved/add", messageId: "msg-1" }]);
    });

    it("rolls back with remove on failure", async () => {
      const { deps, actions } = makeDeps({
        savePost: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await saveMessageOp(deps, params);

      expect(actions).toEqual([
        { type: "saved/add", messageId: "msg-1" },
        { type: "saved/remove", messageId: "msg-1" },
      ]);
    });
  });

  describe("unsaveMessageOp", () => {
    it("dispatches optimistic remove on success", async () => {
      const { deps, actions } = makeDeps({
        saveDelete: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await unsaveMessageOp(deps, params);

      expect(actions).toEqual([{ type: "saved/remove", messageId: "msg-1" }]);
    });

    it("rolls back with add on failure", async () => {
      const { deps, actions } = makeDeps({
        saveDelete: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await unsaveMessageOp(deps, params);

      expect(actions).toEqual([
        { type: "saved/remove", messageId: "msg-1" },
        { type: "saved/add", messageId: "msg-1" },
      ]);
    });
  });

  describe("fetchSavedMessages", () => {
    it("returns normalized saved messages", async () => {
      const rawMessage = {
        id: "msg-1",
        channelId: "ch-1",
        userId: "u-1",
        content: "hello",
        parentMessageId: null,
        replyCount: 0,
        latestReplyAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      const { deps } = makeDeps({
        savedMessagesGet: () =>
          Promise.resolve(
            jsonResponse({
              messages: [
                { message: rawMessage, channelName: "general", savedAt: "2026-01-02T00:00:00.000Z" },
              ],
            }),
          ),
      });

      const result = await fetchSavedMessages(deps, { workspaceSlug: "ws" });

      expect(result).toHaveLength(1);
      expect(result[0]!.channelName).toBe("general");
      expect(result[0]!.savedAt).toBe("2026-01-02T00:00:00.000Z");
      expect(String(result[0]!.message.id)).toBe("msg-1");
      expect(result[0]!.message.content).toBe("hello");
    });
  });

  describe("fetchSavedMessageIds", () => {
    it("returns array of message IDs", async () => {
      const { deps } = makeDeps({
        savedIdsGet: () => Promise.resolve(jsonResponse({ messageIds: ["msg-1", "msg-2"] })),
      });

      const result = await fetchSavedMessageIds(deps, { workspaceSlug: "ws" });

      expect(result).toEqual(["msg-1", "msg-2"]);
    });
  });
});
