import { describe, expect, it } from "bun:test";
import { asChannelId, asMessageId, asUserId, type Message } from "@openslaq/shared";
import { initialState, type ChatAction, type ChatStoreState } from "../../chat-reducer";
import {
  deleteMessage,
  editMessage,
  sendMessage,
  toggleReaction,
} from "../mutations";
import type { OperationDeps } from "../types";

interface Resolvers {
  postReaction?: () => Promise<Response>;
  postMessage?: () => Promise<Response>;
  postReply?: () => Promise<Response>;
  putMessage?: () => Promise<Response>;
  deleteMessage?: () => Promise<Response>;
}

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("m-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("u-1"),
    content: "hello",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Message;
}

function makeDeps(resolvers: Resolvers, state: ChatStoreState = initialState) {
  const actions: ChatAction[] = [];
  let authRequired = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        messages: {
          ":id": {
            reactions: {
              $post: () => (resolvers.postReaction ?? (() => jsonResponse(200, {})))(),
            },
            $put: () => (resolvers.putMessage ?? (() => jsonResponse(200, {})))(),
            $delete: () => (resolvers.deleteMessage ?? (() => jsonResponse(200, {})))(),
          },
        },
        workspaces: {
          ":slug": {
            channels: {
              ":id": {
                messages: {
                  $post: () => (resolvers.postMessage ?? (() => jsonResponse(201, {})))(),
                  ":messageId": {
                    replies: {
                      $post: () => (resolvers.postReply ?? (() => jsonResponse(201, {})))(),
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
        authRequired += 1;
      },
    },
    dispatch: (action) => actions.push(action),
    getState: () => state,
  };

  return { deps, actions, getAuthRequired: () => authRequired };
}

describe("operations/mutations", () => {
  it("toggleReaction applies optimistic update on success", async () => {
    const message = makeMessage();
    const state: ChatStoreState = {
      ...initialState,
      messagesById: { [message.id]: message },
    };
    const { deps, actions } = makeDeps({}, state);

    await toggleReaction(deps, { messageId: message.id, emoji: "👍", userId: "u-2" });

    expect(actions[0]).toEqual({
      type: "messages/updateReactions",
      messageId: message.id,
      reactions: [{ emoji: "👍", count: 1, userIds: [asUserId("u-2")] }],
    });
    expect(actions[1]).toEqual({ type: "mutations/error", error: null });
  });

  it("toggleReaction rolls back and sets error on non-auth failure", async () => {
    const message = makeMessage({ reactions: [{ emoji: "👍", count: 1, userIds: [asUserId("u-2")] }] });
    const state: ChatStoreState = {
      ...initialState,
      messagesById: { [message.id]: message },
    };
    const { deps, actions } = makeDeps(
      {
        postReaction: () => jsonResponse(500, { error: "Reaction failed" }),
      },
      state,
    );

    await toggleReaction(deps, { messageId: message.id, emoji: "👍", userId: "u-2" });

    expect(actions).toEqual([
      { type: "messages/updateReactions", messageId: message.id, reactions: [] },
      { type: "mutations/error", error: null },
      {
        type: "messages/updateReactions",
        messageId: message.id,
        reactions: [{ emoji: "👍", count: 1, userIds: [asUserId("u-2")] }],
      },
      { type: "mutations/error", error: "Reaction failed" },
    ]);
  });

  it("sendMessage posts top-level messages and returns true", async () => {
    const { deps, actions } = makeDeps({
      postMessage: () => jsonResponse(201, { id: "m-2" }),
    });

    const ok = await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "hello",
      attachmentIds: ["a-1"],
    });

    expect(ok).toBe(true);
    expect(actions).toEqual([{ type: "mutations/error", error: null }]);
  });

  it("sendMessage posts thread replies when parentMessageId is provided", async () => {
    let replyCalls = 0;
    const { deps } = makeDeps({
      postReply: async () => {
        replyCalls += 1;
        return await jsonResponse(201, { id: "r-1" });
      },
    });

    const ok = await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "reply",
      parentMessageId: "m-parent",
    });

    expect(ok).toBe(true);
    expect(replyCalls).toBe(1);
  });

  it("sendMessage returns false and sets mutation error for non-auth failure", async () => {
    const { deps, actions, getAuthRequired } = makeDeps({
      postMessage: () => jsonResponse(400, { error: "Bad content" }),
    });

    const ok = await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "",
    });

    expect(ok).toBe(false);
    expect(getAuthRequired()).toBe(0);
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
      { type: "mutations/error", error: "Bad content" },
    ]);
  });

  it("editMessage and deleteMessage trigger auth callback on 401", async () => {
    const { deps, actions, getAuthRequired } = makeDeps({
      putMessage: () => Promise.resolve(new Response(null, { status: 401 })),
      deleteMessage: () => Promise.resolve(new Response(null, { status: 401 })),
    });

    await editMessage(deps, { messageId: "m-1", content: "updated" });
    await deleteMessage(deps, { messageId: "m-1" });

    expect(getAuthRequired()).toBe(2);
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
      { type: "mutations/error", error: null },
    ]);
  });
});
