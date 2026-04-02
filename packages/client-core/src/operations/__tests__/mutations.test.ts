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
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
      expect.objectContaining({ type: "messages/upsert" }),
    ]);
    const upsertAction = actions[1] as Extract<ChatAction, { type: "messages/upsert" }>;
    expect(upsertAction.message.id).toBe(asMessageId("m-2"));
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

  it("sendMessage creates optimistic message when userId is provided", async () => {
    const serverMessage = makeMessage({ id: asMessageId("m-server"), content: "hello" });
    const { deps, actions } = makeDeps({
      postMessage: () => jsonResponse(201, serverMessage),
    });

    const ok = await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "hello",
      userId: "u-1",
      senderDisplayName: "Alice",
    });

    expect(ok).toBe(true);
    // First action: optimistic upsert with temp ID
    const optimistic = actions[0] as Extract<ChatAction, { type: "messages/upsert" }>;
    expect(optimistic.type).toBe("messages/upsert");
    expect(String(optimistic.message.id)).toMatch(/^optimistic-/);
    expect(optimistic.message.content).toBe("hello");
    expect(optimistic.message.userId).toBe(asUserId("u-1"));
    expect(optimistic.message.senderDisplayName).toBe("Alice");
    // Second: mutations/error null
    expect(actions[1]).toEqual({ type: "mutations/error", error: null });
    // Third: replace optimistic with real message
    const replace = actions[2] as Extract<ChatAction, { type: "messages/replaceOptimistic" }>;
    expect(replace.type).toBe("messages/replaceOptimistic");
    expect(String(replace.tempId)).toMatch(/^optimistic-/);
    expect(replace.message.id).toBe(asMessageId("m-server"));
  });

  it("sendMessage removes optimistic message on API failure", async () => {
    const { deps, actions } = makeDeps({
      postMessage: () => jsonResponse(500, { error: "Server error" }),
    });

    const ok = await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "hello",
      userId: "u-1",
    });

    expect(ok).toBe(false);
    // First: optimistic upsert
    expect(actions[0]).toEqual(expect.objectContaining({ type: "messages/upsert" }));
    // Second: mutations/error null
    expect(actions[1]).toEqual({ type: "mutations/error", error: null });
    // Third: delete optimistic message
    const deleteAction = actions[2] as Extract<ChatAction, { type: "messages/delete" }>;
    expect(deleteAction.type).toBe("messages/delete");
    expect(deleteAction.messageId).toMatch(/^optimistic-/);
    expect(deleteAction.channelId).toBe("ch-1");
    // Fourth: mutations/error with message
    expect(actions[3]).toEqual({ type: "mutations/error", error: "Server error" });
  });

  it("sendMessage optimistic message uses provided senderAvatarUrl", async () => {
    const serverMessage = makeMessage({ id: asMessageId("m-server") });
    const { deps, actions } = makeDeps({
      postMessage: () => jsonResponse(201, serverMessage),
    });

    await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "hello",
      userId: "u-1",
      senderDisplayName: "Alice",
      senderAvatarUrl: "https://example.com/alice.jpg",
    });

    const optimistic = actions[0] as Extract<ChatAction, { type: "messages/upsert" }>;
    expect(optimistic.message.senderAvatarUrl).toBe("https://example.com/alice.jpg");
  });

  it("sendMessage optimistic message never uses hardcoded placeholder names", async () => {
    const serverMessage = makeMessage({
      id: asMessageId("m-server"),
      senderDisplayName: "Alice Johnson",
      senderAvatarUrl: "https://example.com/alice.jpg",
    });
    const { deps, actions } = makeDeps({
      postMessage: () => jsonResponse(201, serverMessage),
    });

    await sendMessage(deps, {
      channelId: "ch-1",
      workspaceSlug: "ws",
      content: "hello",
      userId: "u-1",
      senderDisplayName: "Alice Johnson",
      senderAvatarUrl: "https://example.com/alice.jpg",
    });

    const optimistic = actions[0] as Extract<ChatAction, { type: "messages/upsert" }>;
    const replace = actions[2] as Extract<ChatAction, { type: "messages/replaceOptimistic" }>;

    // Optimistic and server messages should show the same sender info — no visible glitch
    expect(optimistic.message.senderDisplayName).toBe(replace.message.senderDisplayName);
    expect(optimistic.message.senderAvatarUrl).toBe(replace.message.senderAvatarUrl);
  });

  it("sendMessage without userId skips optimistic update (backward compat)", async () => {
    const { deps, actions } = makeDeps({
      postMessage: () => jsonResponse(201, { id: "m-2" }),
    });

    await sendMessage(deps, { channelId: "ch-1", workspaceSlug: "ws", content: "hello" });

    expect(actions[0]).toEqual({ type: "mutations/error", error: null });
    expect(actions[1]).toEqual(expect.objectContaining({ type: "messages/upsert" }));
  });

  it("editMessage and deleteMessage trigger auth callback on 401", async () => {
    const { deps, getAuthRequired } = makeDeps({
      putMessage: () => Promise.resolve(new Response(null, { status: 401 })),
      deleteMessage: () => Promise.resolve(new Response(null, { status: 401 })),
    });

    await editMessage(deps, { messageId: "m-1", content: "updated" });
    await deleteMessage(deps, { messageId: "m-1" });

    expect(getAuthRequired()).toBe(2);
  });

  it("editMessage applies optimistic update then confirms with server response", async () => {
    const message = makeMessage({ content: "original" });
    const serverMessage = makeMessage({ content: "updated", updatedAt: "2026-01-02T00:00:00.000Z" });
    const state: ChatStoreState = {
      ...initialState,
      messagesById: { [message.id]: message },
    };
    const { deps, actions } = makeDeps(
      { putMessage: () => jsonResponse(200, serverMessage) },
      state,
    );

    await editMessage(deps, { messageId: message.id, content: "updated" });

    // 1st: optimistic upsert with new content
    const optimistic = actions[0] as Extract<ChatAction, { type: "messages/upsert" }>;
    expect(optimistic.type).toBe("messages/upsert");
    expect(optimistic.message.content).toBe("updated");
    expect(optimistic.message.id).toBe(message.id);
    // 2nd: clear error
    expect(actions[1]).toEqual({ type: "mutations/error", error: null });
    // 3rd: server confirmation
    const confirmed = actions[2] as Extract<ChatAction, { type: "messages/upsert" }>;
    expect(confirmed.type).toBe("messages/upsert");
    expect(confirmed.message.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("editMessage rolls back on non-auth failure", async () => {
    const message = makeMessage({ content: "original" });
    const state: ChatStoreState = {
      ...initialState,
      messagesById: { [message.id]: message },
    };
    const { deps, actions } = makeDeps(
      { putMessage: () => jsonResponse(500, { error: "Edit failed" }) },
      state,
    );

    await editMessage(deps, { messageId: message.id, content: "updated" });

    expect(actions).toEqual([
      // optimistic
      expect.objectContaining({ type: "messages/upsert", message: expect.objectContaining({ content: "updated" }) }),
      // clear error
      { type: "mutations/error", error: null },
      // rollback to original
      { type: "messages/upsert", message },
      // set error
      { type: "mutations/error", error: "Edit failed" },
    ]);
  });

  it("editMessage works when message not in state", async () => {
    const serverMessage = makeMessage({ content: "updated" });
    const { deps, actions } = makeDeps(
      { putMessage: () => jsonResponse(200, serverMessage) },
    );

    await editMessage(deps, { messageId: "m-1", content: "updated" });

    // No optimistic upsert (message not in state), just clear error + server confirm
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
      { type: "messages/upsert", message: serverMessage },
    ]);
  });

  it("deleteMessage applies optimistic delete on success", async () => {
    const message = makeMessage();
    const state: ChatStoreState = {
      ...initialState,
      messagesById: { [message.id]: message },
    };
    const { deps, actions } = makeDeps(
      { deleteMessage: () => jsonResponse(200, {}) },
      state,
    );

    await deleteMessage(deps, { messageId: message.id });

    // 1st: optimistic delete
    expect(actions[0]).toEqual({ type: "messages/delete", messageId: message.id, channelId: message.channelId });
    // 2nd: clear error
    expect(actions[1]).toEqual({ type: "mutations/error", error: null });
    // No further actions on success
    expect(actions).toHaveLength(2);
  });

  it("deleteMessage restores message on non-auth failure", async () => {
    const message = makeMessage();
    const state: ChatStoreState = {
      ...initialState,
      messagesById: { [message.id]: message },
    };
    const { deps, actions } = makeDeps(
      { deleteMessage: () => jsonResponse(500, { error: "Delete failed" }) },
      state,
    );

    await deleteMessage(deps, { messageId: message.id });

    expect(actions).toEqual([
      // optimistic delete
      { type: "messages/delete", messageId: message.id, channelId: message.channelId },
      // clear error
      { type: "mutations/error", error: null },
      // rollback: restore message
      { type: "messages/upsert", message },
      // set error
      { type: "mutations/error", error: "Delete failed" },
    ]);
  });

  it("deleteMessage skips optimistic delete when message not in state", async () => {
    const { deps, actions } = makeDeps(
      { deleteMessage: () => jsonResponse(200, {}) },
    );

    await deleteMessage(deps, { messageId: "m-unknown" });

    // No optimistic delete, just clear error
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
    ]);
  });
});
