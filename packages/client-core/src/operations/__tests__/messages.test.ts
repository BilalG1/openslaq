import { describe, expect, it } from "bun:test";
import { AuthError, ApiError } from "../../api/errors";
import { initialState, type ChatAction } from "../../chat-reducer";
import { loadChannelMessages, loadOlderMessages, loadNewerMessages } from "../messages";
import type { OperationDeps } from "../types";

function makeDeps(resolvers: {
  getMessages?: (query: Record<string, string>) => Promise<Response>;
  authToken?: string;
}) {
  const actions: ChatAction[] = [];
  let authRequiredCount = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              ":id": {
                messages: {
                  $get: ({ query }: { query: Record<string, string> }, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.getMessages ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(query);
                  },
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

function okMessagesResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

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

describe("operations/messages", () => {
  it("loadChannelMessages dispatches loadStart then setMessages with normalized pagination", async () => {
    const { deps, actions } = makeDeps({
      getMessages: () => okMessagesResponse({ messages: [rawMessage], nextCursor: "cursor-1" }),
    });

    await loadChannelMessages(deps, { workspaceSlug: "ws", channelId: "ch-1" });

    expect(actions[0]).toEqual({ type: "channel/loadStart", channelId: "ch-1" });
    expect(actions[1]).toEqual(
      expect.objectContaining({
        type: "channel/setMessages",
        channelId: "ch-1",
        olderCursor: "cursor-1",
        newerCursor: null,
        hasOlder: true,
        hasNewer: false,
      }),
    );
  });

  it("loadChannelMessages triggers onAuthRequired for AuthError", async () => {
    const { deps, actions, getAuthRequiredCount } = makeDeps({
      getMessages: () => Promise.resolve(new Response(null, { status: 401 })),
    });

    await loadChannelMessages(deps, { workspaceSlug: "ws", channelId: "ch-1" });

    expect(getAuthRequiredCount()).toBe(1);
    expect(actions).toEqual([{ type: "channel/loadStart", channelId: "ch-1" }]);
  });

  it("loadChannelMessages dispatches loadError for non-auth failures", async () => {
    const { deps, actions } = makeDeps({
      getMessages: () => Promise.resolve(new Response(JSON.stringify({ error: "Nope" }), { status: 500 })),
    });

    await loadChannelMessages(deps, { workspaceSlug: "ws", channelId: "ch-1" });

    expect(actions[1]).toEqual({ type: "channel/loadError", channelId: "ch-1", error: "Nope" });
  });

  it("loadOlderMessages appends prepend action with hasOlder false when cursor exhausted", async () => {
    const { deps, actions } = makeDeps({
      getMessages: (query) => {
        expect(query).toEqual({ cursor: "c-old", direction: "older" });
        return okMessagesResponse({ messages: [rawMessage], nextCursor: null });
      },
    });

    await loadOlderMessages(deps, { workspaceSlug: "ws", channelId: "ch-1", cursor: "c-old" });

    expect(actions[0]).toEqual({ type: "channel/setLoadingOlder", channelId: "ch-1", loading: true });
    expect(actions[1]).toEqual(
      expect.objectContaining({ type: "channel/prependMessages", olderCursor: null, hasOlder: false }),
    );
  });

  it("loadOlderMessages resets loading flag and dispatches error on failure", async () => {
    const { deps, actions } = makeDeps({
      getMessages: () => Promise.reject(new ApiError(503, "upstream")),
    });

    await loadOlderMessages(deps, { workspaceSlug: "ws", channelId: "ch-1", cursor: "c-old" });

    expect(actions).toEqual([
      { type: "channel/setLoadingOlder", channelId: "ch-1", loading: true },
      { type: "channel/setLoadingOlder", channelId: "ch-1", loading: false },
      { type: "mutations/error", error: "upstream" },
    ]);
  });

  it("loadNewerMessages appends replies and supports hasNewer=true", async () => {
    const { deps, actions } = makeDeps({
      getMessages: (query) => {
        expect(query).toEqual({ cursor: "c-new", direction: "newer" });
        return okMessagesResponse({ messages: [rawMessage], nextCursor: "next-new" });
      },
    });

    await loadNewerMessages(deps, { workspaceSlug: "ws", channelId: "ch-1", cursor: "c-new" });

    expect(actions[0]).toEqual({ type: "channel/setLoadingNewer", channelId: "ch-1", loading: true });
    expect(actions[1]).toEqual(
      expect.objectContaining({ type: "channel/appendMessages", newerCursor: "next-new", hasNewer: true }),
    );
  });

  it("loadNewerMessages resets loading flag on failure", async () => {
    const { deps, actions } = makeDeps({
      getMessages: () => Promise.reject(new AuthError()),
    });

    await loadNewerMessages(deps, { workspaceSlug: "ws", channelId: "ch-1", cursor: "c-new" });

    expect(actions).toEqual([
      { type: "channel/setLoadingNewer", channelId: "ch-1", loading: true },
      { type: "channel/setLoadingNewer", channelId: "ch-1", loading: false },
    ]);
  });
});
