import { describe, test, expect } from "bun:test";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";
import type { Message, ReactionGroup } from "@openslaq/shared";
import type { ChatStoreState } from "../chat-reducer";
import { initialState } from "../chat-reducer";
import { toggleReaction } from "./mutations";
import type { OperationDeps } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    content: "hello",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Message;
}

function makeDeps(stateOverrides: Partial<ChatStoreState> = {}, resolvers: { postReaction?: () => Promise<Response> } = {}): {
  deps: OperationDeps;
  dispatched: unknown[];
} {
  const dispatched: unknown[] = [];
  const state: ChatStoreState = { ...initialState, ...stateOverrides };
  const deps: OperationDeps = {
    api: {
      api: {
        messages: {
          ":id": {
            reactions: {
              $post: () => (resolvers.postReaction ?? (() => jsonResponse(200, {})))(),
            },
            $put: () => jsonResponse(200, {}),
            $delete: () => jsonResponse(200, {}),
          },
        },
        workspaces: {
          ":slug": {
            channels: {
              ":id": {
                messages: {
                  $post: () => jsonResponse(201, {}),
                  ":messageId": { replies: { $post: () => jsonResponse(201, {}) } },
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
    dispatch: (action: unknown) => {
      dispatched.push(action);
    },
    getState: () => state,
  };
  return { deps, dispatched };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("toggleReaction", () => {
  test("adds a new emoji reaction to a message", async () => {
    const msg = makeMessage({ reactions: [] });
    const { deps, dispatched } = makeDeps({
      messagesById: { [msg.id]: msg },
    });

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "thumbsup",
      userId: String(asUserId("user-1")),
    });

    const optimistic = dispatched[0] as {
      type: string;
      reactions: ReactionGroup[];
    };
    expect(optimistic.type).toBe("messages/updateReactions");
    expect(optimistic.reactions).toHaveLength(1);
    expect(optimistic.reactions[0]!.emoji).toBe("thumbsup");
    expect(optimistic.reactions[0]!.count).toBe(1);
    expect(optimistic.reactions[0]!.userIds).toEqual([asUserId("user-1")]);
  });

  test("removes entire reaction group when user is the only reactor", async () => {
    const msg = makeMessage({
      reactions: [{ emoji: "thumbsup", count: 1, userIds: [asUserId("user-1")] }],
    });
    const { deps, dispatched } = makeDeps({
      messagesById: { [msg.id]: msg },
    });

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "thumbsup",
      userId: String(asUserId("user-1")),
    });

    const optimistic = dispatched[0] as {
      type: string;
      reactions: ReactionGroup[];
    };
    expect(optimistic.type).toBe("messages/updateReactions");
    expect(optimistic.reactions).toHaveLength(0);
  });

  test("removes own reaction but keeps group when others remain", async () => {
    const msg = makeMessage({
      reactions: [
        { emoji: "thumbsup", count: 2, userIds: [asUserId("user-1"), asUserId("user-2")] },
      ],
    });
    const { deps, dispatched } = makeDeps({
      messagesById: { [msg.id]: msg },
    });

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "thumbsup",
      userId: String(asUserId("user-1")),
    });

    const optimistic = dispatched[0] as {
      type: string;
      reactions: ReactionGroup[];
    };
    expect(optimistic.type).toBe("messages/updateReactions");
    expect(optimistic.reactions).toHaveLength(1);
    expect(optimistic.reactions[0]!.count).toBe(1);
    expect(optimistic.reactions[0]!.userIds).toEqual([asUserId("user-2")]);
  });

  test("adds to an existing emoji reaction from a different user", async () => {
    const msg = makeMessage({
      reactions: [{ emoji: "thumbsup", count: 1, userIds: [asUserId("user-2")] }],
    });
    const { deps, dispatched } = makeDeps({
      messagesById: { [msg.id]: msg },
    });

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "thumbsup",
      userId: String(asUserId("user-1")),
    });

    const optimistic = dispatched[0] as {
      type: string;
      reactions: ReactionGroup[];
    };
    expect(optimistic.type).toBe("messages/updateReactions");
    expect(optimistic.reactions).toHaveLength(1);
    expect(optimistic.reactions[0]!.count).toBe(2);
    expect(optimistic.reactions[0]!.userIds).toEqual([asUserId("user-2"), asUserId("user-1")]);
  });

  test("no optimistic update when message is not in state", async () => {
    const { deps, dispatched } = makeDeps({
      messagesById: {},
    });

    await toggleReaction(deps, {
      messageId: "non-existent",
      emoji: "thumbsup",
      userId: String(asUserId("user-1")),
    });

    const reactionUpdates = (dispatched as { type: string }[]).filter(
      (a) => a.type === "messages/updateReactions",
    );
    expect(reactionUpdates).toHaveLength(0);
  });

  test("reverts reactions on API error", async () => {
    const originalReactions: ReactionGroup[] = [
      { emoji: "heart", count: 1, userIds: [asUserId("user-2")] },
    ];
    const msg = makeMessage({ reactions: originalReactions });
    const { deps, dispatched } = makeDeps(
      { messagesById: { [msg.id]: msg } },
      { postReaction: () => Promise.resolve(new Response(null, { status: 500 })) },
    );

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "thumbsup",
      userId: String(asUserId("user-1")),
    });

    // Dispatches: optimistic update, mutations/error clear, revert, mutations/error set
    const reactionUpdates = (dispatched as { type: string; reactions?: ReactionGroup[] }[]).filter(
      (a) => a.type === "messages/updateReactions",
    );
    expect(reactionUpdates).toHaveLength(2);
    // Second update should revert to original
    expect(reactionUpdates[1]!.reactions).toEqual(originalReactions);

    const errorActions = (dispatched as { type: string; error?: string | null }[]).filter(
      (a) => a.type === "mutations/error" && a.error !== null,
    );
    expect(errorActions).toHaveLength(1);
  });

  test("handles message with empty reactions array", async () => {
    const msg = makeMessage({ reactions: [] });
    const { deps, dispatched } = makeDeps({
      messagesById: { [msg.id]: msg },
    });

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "fire",
      userId: String(asUserId("user-1")),
    });

    const optimistic = dispatched[0] as {
      type: string;
      reactions: ReactionGroup[];
    };
    expect(optimistic.type).toBe("messages/updateReactions");
    expect(optimistic.reactions).toHaveLength(1);
    expect(optimistic.reactions[0]!.emoji).toBe("fire");
  });

  test("handles message with undefined reactions field", async () => {
    const msg = makeMessage();
    // Force reactions to undefined
    (msg as unknown as Record<string, unknown>).reactions = undefined;
    const { deps, dispatched } = makeDeps({
      messagesById: { [msg.id]: msg },
    });

    await toggleReaction(deps, {
      messageId: String(msg.id),
      emoji: "rocket",
      userId: String(asUserId("user-1")),
    });

    const optimistic = dispatched[0] as {
      type: string;
      reactions: ReactionGroup[];
    };
    expect(optimistic.type).toBe("messages/updateReactions");
    expect(optimistic.reactions).toHaveLength(1);
    expect(optimistic.reactions[0]!.emoji).toBe("rocket");
    expect(optimistic.reactions[0]!.count).toBe(1);
    expect(optimistic.reactions[0]!.userIds).toEqual([asUserId("user-1")]);
  });
});
