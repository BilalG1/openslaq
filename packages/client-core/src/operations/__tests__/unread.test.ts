import { describe, expect, it } from "bun:test";
import { asChannelId, asMessageId, asUserId, type Message } from "@openslaq/shared";
import { initialState } from "../../chat-reducer";
import { handleNewMessageUnread, markChannelAsRead } from "../unread";
import type { OperationDeps } from "../types";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("m-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("u-other"),
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

describe("operations/unread", () => {
  it("increments unread for top-level messages in inactive channels", () => {
    const action = handleNewMessageUnread(makeMessage(), {
      currentUserId: "u-me",
      activeChannelId: "ch-active",
      activeDmId: null,
    });

    expect(action).toEqual({ type: "unread/increment", channelId: "ch-1" });
  });

  it("returns null for own messages, thread replies, and active channel", () => {
    const own = handleNewMessageUnread(makeMessage({ userId: asUserId("u-me") }), {
      currentUserId: "u-me",
      activeChannelId: null,
      activeDmId: null,
    });
    const reply = handleNewMessageUnread(makeMessage({ parentMessageId: asMessageId("m-parent") }), {
      currentUserId: "u-me",
      activeChannelId: null,
      activeDmId: null,
    });
    const active = handleNewMessageUnread(makeMessage({ channelId: asChannelId("ch-active") }), {
      currentUserId: "u-me",
      activeChannelId: "ch-active",
      activeDmId: null,
    });

    expect(own).toBeNull();
    expect(reply).toBeNull();
    expect(active).toBeNull();
  });

  it("markChannelAsRead triggers auth callback on 401", async () => {
    let authRequired = 0;

    const deps: OperationDeps = {
      api: {
        api: {
          workspaces: {
            ":slug": {
              channels: {
                ":id": {
                  read: {
                    $post: () => Promise.resolve(new Response(null, { status: 401 })),
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
      dispatch: () => {},
      getState: () => initialState,
    };

    await markChannelAsRead(deps, { workspaceSlug: "ws", channelId: "ch-1" });

    expect(authRequired).toBe(1);
  });
});
