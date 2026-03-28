import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import { loadOlderReplies, loadThreadMessages } from "../threads";
import type { OperationDeps } from "../types";

function makeDeps(resolvers: {
  getMessageById?: () => Promise<Response>;
  getReplies?: (query: Record<string, string>) => Promise<Response>;
}) {
  const actions: ChatAction[] = [];
  let authRequiredCount = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        messages: {
          ":id": {
            $get: () =>
              (resolvers.getMessageById ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
          },
        },
        workspaces: {
          ":slug": {
            channels: {
              ":id": {
                messages: {
                  ":messageId": {
                    replies: {
                      $get: ({ query }: { query: Record<string, string> }) =>
                        (resolvers.getReplies ??
                          (() => Promise.resolve(new Response(null, { status: 500 }))))(query),
                    },
                  },
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

const parent = {
  id: "m-parent",
  channelId: "ch-1",
  userId: "u-1",
  content: "parent",
  parentMessageId: null,
  replyCount: 1,
  latestReplyAt: "2026-01-01T00:10:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const reply = {
  id: "m-reply",
  channelId: "ch-1",
  userId: "u-2",
  content: "reply",
  parentMessageId: "m-parent",
  replyCount: 0,
  latestReplyAt: null,
  createdAt: "2026-01-01T00:10:00.000Z",
  updatedAt: "2026-01-01T00:10:00.000Z",
};

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("operations/threads", () => {
  it("loadThreadMessages dispatches thread data with olderCursor (newest-first)", async () => {
    const { deps, actions } = makeDeps({
      getMessageById: () => jsonResponse(200, parent),
      getReplies: (query) => {
        expect(query).toEqual({});
        return jsonResponse(200, { messages: [reply], nextCursor: "reply-cursor" });
      },
    });

    await loadThreadMessages(deps, {
      workspaceSlug: "ws",
      channelId: "ch-1",
      parentMessageId: "m-parent",
    });

    expect(actions[0]).toEqual({ type: "thread/loadStart", parentMessageId: "m-parent" });
    expect(actions[1]).toEqual(
      expect.objectContaining({
        type: "thread/setData",
        olderCursor: "reply-cursor",
        hasOlder: true,
      }),
    );
  });

  it("loadThreadMessages reverses replies from API (desc → asc)", async () => {
    const reply1 = { ...reply, id: "m-reply-1", createdAt: "2026-01-01T00:05:00.000Z", updatedAt: "2026-01-01T00:05:00.000Z" };
    const reply2 = { ...reply, id: "m-reply-2", createdAt: "2026-01-01T00:10:00.000Z", updatedAt: "2026-01-01T00:10:00.000Z" };

    const { deps, actions } = makeDeps({
      getMessageById: () => jsonResponse(200, parent),
      // API returns desc order: reply2 (newer) first, then reply1 (older)
      getReplies: () => jsonResponse(200, { messages: [reply2, reply1], nextCursor: null }),
    });

    await loadThreadMessages(deps, {
      workspaceSlug: "ws",
      channelId: "ch-1",
      parentMessageId: "m-parent",
    });

    const setDataAction = actions[1] as Extract<ChatAction, { type: "thread/setData" }>;
    // After reversal, reply1 (older) should come first
    expect(String(setDataAction.replies[0]!.id)).toBe("m-reply-1");
    expect(String(setDataAction.replies[1]!.id)).toBe("m-reply-2");
  });

  it("loadThreadMessages dispatches Thread not found when parent payload is malformed", async () => {
    const { deps, actions } = makeDeps({
      getMessageById: () => jsonResponse(200, { error: "not found" }),
      getReplies: () => jsonResponse(200, { messages: [], nextCursor: null }),
    });

    await loadThreadMessages(deps, {
      workspaceSlug: "ws",
      channelId: "ch-1",
      parentMessageId: "m-parent",
    });

    expect(actions[1]).toEqual({
      type: "thread/loadError",
      parentMessageId: "m-parent",
      error: "Thread not found",
    });
  });

  it("loadThreadMessages triggers auth callback on 401", async () => {
    const { deps, actions, getAuthRequiredCount } = makeDeps({
      getMessageById: () => Promise.resolve(new Response(null, { status: 401 })),
      getReplies: () => jsonResponse(200, { messages: [], nextCursor: null }),
    });

    await loadThreadMessages(deps, {
      workspaceSlug: "ws",
      channelId: "ch-1",
      parentMessageId: "m-parent",
    });

    expect(getAuthRequiredCount()).toBe(1);
    expect(actions).toEqual([{ type: "thread/loadStart", parentMessageId: "m-parent" }]);
  });

  it("loadOlderReplies prepends replies and updates hasOlder", async () => {
    const { deps, actions } = makeDeps({
      getReplies: (query) => {
        expect(query).toEqual({ cursor: "cursor-2", direction: "older" });
        return jsonResponse(200, { messages: [reply], nextCursor: null });
      },
    });

    await loadOlderReplies(deps, {
      workspaceSlug: "ws",
      channelId: "ch-1",
      parentMessageId: "m-parent",
      cursor: "cursor-2",
    });

    expect(actions).toEqual([
      { type: "thread/setLoadingOlder", parentMessageId: "m-parent", loading: true },
      expect.objectContaining({
        type: "thread/prependReplies",
        parentMessageId: "m-parent",
        olderCursor: null,
        hasOlder: false,
      }),
    ]);
  });

  it("loadOlderReplies resets loading flag on failure", async () => {
    const { deps, actions } = makeDeps({
      getReplies: () => Promise.reject(new Error("network")),
    });

    await loadOlderReplies(deps, {
      workspaceSlug: "ws",
      channelId: "ch-1",
      parentMessageId: "m-parent",
      cursor: "cursor-2",
    });

    expect(actions).toEqual([
      { type: "thread/setLoadingOlder", parentMessageId: "m-parent", loading: true },
      { type: "thread/setLoadingOlder", parentMessageId: "m-parent", loading: false },
      { type: "mutations/error", error: "network" },
    ]);
  });
});
