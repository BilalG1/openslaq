import { describe, test, expect } from "bun:test";
import { handleNewMessageUnread } from "./unread";
import type { Message, MessageId, UserId } from "@openslaq/shared";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    channelId: "ch-1",
    userId: "user-other",
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

const baseCtx = {
  currentUserId: "user-me",
  activeChannelId: null,
  activeDmId: null,
  activeGroupDmId: null,
  channelNotificationPrefs: {},
};

describe("handleNewMessageUnread", () => {
  test("returns increment for a normal new message", () => {
    const result = handleNewMessageUnread(makeMessage(), baseCtx);
    expect(result).toEqual({ type: "unread/increment", channelId: "ch-1" });
  });

  test("returns null for thread replies", () => {
    const result = handleNewMessageUnread(
      makeMessage({ parentMessageId: "msg-parent" as MessageId }),
      baseCtx,
    );
    expect(result).toBeNull();
  });

  test("returns null for own messages", () => {
    const result = handleNewMessageUnread(
      makeMessage({ userId: "user-me" as UserId }),
      baseCtx,
    );
    expect(result).toBeNull();
  });

  test("returns null for active channel", () => {
    const result = handleNewMessageUnread(makeMessage(), {
      ...baseCtx,
      activeChannelId: "ch-1",
    });
    expect(result).toBeNull();
  });

  test("returns null for muted channel", () => {
    const result = handleNewMessageUnread(makeMessage(), {
      ...baseCtx,
      channelNotificationPrefs: { "ch-1": "muted" },
    });
    expect(result).toBeNull();
  });

  test("returns null for mentions-only channel with no mentions", () => {
    const result = handleNewMessageUnread(makeMessage({ mentions: [] }), {
      ...baseCtx,
      channelNotificationPrefs: { "ch-1": "mentions" },
    });
    expect(result).toBeNull();
  });

  test("returns increment for mentions-only channel with direct @mention", () => {
    const msg = makeMessage({
      mentions: [{ userId: "user-me" as UserId, displayName: "Me", type: "user" }],
    });
    const result = handleNewMessageUnread(msg, {
      ...baseCtx,
      channelNotificationPrefs: { "ch-1": "mentions" },
    });
    expect(result).toEqual({ type: "unread/increment", channelId: "ch-1" });
  });

  test("returns increment for mentions-only channel with @here mention", () => {
    const msg = makeMessage({
      mentions: [{ userId: "here" as UserId, displayName: "@here", type: "here" }],
    });
    const result = handleNewMessageUnread(msg, {
      ...baseCtx,
      channelNotificationPrefs: { "ch-1": "mentions" },
    });
    // @here should trigger an unread, but currently it doesn't because
    // the code only checks m.userId === currentUserId
    expect(result).toEqual({ type: "unread/increment", channelId: "ch-1" });
  });

  test("returns increment for mentions-only channel with @channel mention", () => {
    const msg = makeMessage({
      mentions: [{ userId: "channel" as UserId, displayName: "@channel", type: "channel" }],
    });
    const result = handleNewMessageUnread(msg, {
      ...baseCtx,
      channelNotificationPrefs: { "ch-1": "mentions" },
    });
    expect(result).toEqual({ type: "unread/increment", channelId: "ch-1" });
  });
});
