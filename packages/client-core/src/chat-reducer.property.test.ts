import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import { chatReducer, initialState, type ChatStoreState, type ChatAction } from "./chat-reducer";
import type { Message } from "@openslaq/shared";

function makeMessage(id: string, channelId: string, createdAt: string): Message {
  return {
    id,
    channelId,
    userId: "user-1",
    content: "hello",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt,
    updatedAt: createdAt,
  } as unknown as Message;
}

// Arbitrary for ISO date strings spread over a range
const isoDate = fc
  .integer({ min: 1_000_000_000_000, max: 1_900_000_000_000 })
  .map((ts) => new Date(ts).toISOString());

const messageId = fc.stringMatching(/^msg-[a-z0-9]{1,8}$/);
const channelId = fc.constant("ch-1");

describe("chat-reducer property tests", () => {
  describe("insertSortedByCreatedAt via message/upsert", () => {
    test("messages stay sorted by createdAt after any sequence of upserts", () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(messageId, isoDate), { minLength: 1, maxLength: 30 }),
          (messages) => {
            let state: ChatStoreState = {
              ...initialState,
              channelMessageIds: { "ch-1": [] },
            };

            for (const [id, date] of messages) {
              const msg = makeMessage(id, "ch-1", date);
              state = chatReducer(state, {
                type: "message/upsert",
                message: msg,
              } as unknown as ChatAction);
            }

            const ids = state.channelMessageIds["ch-1"] ?? [];
            for (let i = 1; i < ids.length; i++) {
              const prevDate = new Date(state.messagesById[ids[i - 1]!]!.createdAt).getTime();
              const currDate = new Date(state.messagesById[ids[i]!]!.createdAt).getTime();
              expect(currDate).toBeGreaterThanOrEqual(prevDate);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    test("no duplicate IDs after repeated upserts", () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(messageId, isoDate), { minLength: 1, maxLength: 30 }),
          (messages) => {
            let state: ChatStoreState = {
              ...initialState,
              channelMessageIds: { "ch-1": [] },
            };

            for (const [id, date] of messages) {
              const msg = makeMessage(id, "ch-1", date);
              state = chatReducer(state, {
                type: "message/upsert",
                message: msg,
              } as unknown as ChatAction);
            }

            const ids = state.channelMessageIds["ch-1"] ?? [];
            expect(ids.length).toBe(new Set(ids).size);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("unread counts", () => {
    test("unread counts never become negative", () => {
      const unreadAction = fc.oneof(
        channelId.map((ch) => ({
          type: "unread/increment" as const,
          channelId: ch,
        })),
        channelId.map((ch) => ({
          type: "unread/clear" as const,
          channelId: ch,
        })),
        fc.tuple(channelId, fc.nat({ max: 20 })).map(([ch, count]) => ({
          type: "unread/setCount" as const,
          channelId: ch,
          count,
        })),
      );

      fc.assert(
        fc.property(fc.array(unreadAction, { minLength: 1, maxLength: 50 }), (actions) => {
          let state = initialState;
          for (const action of actions) {
            state = chatReducer(state, action as ChatAction);
          }
          for (const count of Object.values(state.unreadCounts)) {
            expect(count).toBeGreaterThanOrEqual(0);
          }
        }),
        { numRuns: 200 },
      );
    });
  });

  describe("channel/setMessages + prepend/append", () => {
    test("message IDs are always deduplicated after setMessages", () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(messageId, isoDate), { minLength: 1, maxLength: 20 }),
          (messages) => {
            const msgs = messages.map(([id, date]) => makeMessage(id, "ch-1", date));
            const state = chatReducer(initialState, {
              type: "channel/setMessages",
              channelId: "ch-1",
              messages: msgs,
            });
            const ids = state.channelMessageIds["ch-1"] ?? [];
            expect(ids.length).toBe(new Set(ids).size);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("prepend + set keeps IDs unique", () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(messageId, isoDate), { minLength: 1, maxLength: 10 }),
          fc.array(fc.tuple(messageId, isoDate), { minLength: 1, maxLength: 10 }),
          (setMsgs, prependMsgs) => {
            const set = setMsgs.map(([id, date]) => makeMessage(id, "ch-1", date));
            const prepend = prependMsgs.map(([id, date]) => makeMessage(id, "ch-1", date));

            let state = chatReducer(initialState, {
              type: "channel/setMessages",
              channelId: "ch-1",
              messages: set,
            });
            state = chatReducer(state, {
              type: "channel/prependMessages",
              channelId: "ch-1",
              messages: prepend,
              olderCursor: null,
              hasOlder: false,
            });

            const ids = state.channelMessageIds["ch-1"] ?? [];
            expect(ids.length).toBe(new Set(ids).size);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
