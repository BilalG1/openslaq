import { describe, expect, test } from "bun:test";
import { OpenSlaqApiError } from "../index";
import type { Message, MessageListResponse, MessagesAroundResponse, SavedMessagesResponse } from "../types";
import { createClient } from "./test-utils";

const fakeMessage: Message = {
  id: "msg-1",
  channelId: "ch-1",
  userId: "user-1",
  content: "Hello world",
  parentMessageId: null,
  replyCount: 0,
  latestReplyAt: null,
  attachments: [],
  reactions: [],
  mentions: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const fakeListResponse: MessageListResponse = {
  messages: [fakeMessage],
  nextCursor: null,
};

describe("Messages resource", () => {
  test("send() POSTs to correct URL with body", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 201, body: fakeMessage };
    });

    const result = await client.messages.send("ch-1", { content: "Hello world" });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages");
    expect(JSON.parse(capturedBody)).toEqual({ content: "Hello world" });
    expect(result.id).toBe("msg-1");
  });

  test("send() includes attachmentIds when provided", async () => {
    let capturedBody = "";
    const client = createClient((_url, init) => {
      capturedBody = init?.body as string;
      return { status: 201, body: fakeMessage };
    });

    await client.messages.send("ch-1", { content: "File", attachmentIds: ["att-1"] });
    expect(JSON.parse(capturedBody).attachmentIds).toEqual(["att-1"]);
  });

  test("list() GETs with pagination query params", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeListResponse };
    });

    const result = await client.messages.list("ch-1", { limit: 25, direction: "newer" });
    const url = new URL(capturedUrl);
    expect(url.pathname).toBe("/api/workspaces/test-ws/channels/ch-1/messages");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("direction")).toBe("newer");
    expect(result.messages).toHaveLength(1);
  });

  test("list() works without options", async () => {
    const client = createClient(() => ({ status: 200, body: fakeListResponse }));
    const result = await client.messages.list("ch-1");
    expect(result.messages).toHaveLength(1);
  });

  test("get() GETs global message URL", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeMessage };
    });

    const result = await client.messages.get("msg-1");
    expect(capturedUrl).toContain("/api/messages/msg-1");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(result.content).toBe("Hello world");
  });

  test("edit() PUTs to global message URL with body", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body as string;
      return { status: 200, body: { ...fakeMessage, content: "Updated" } };
    });

    const result = await client.messages.edit("msg-1", { content: "Updated" });
    expect(capturedUrl).toContain("/api/messages/msg-1");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(capturedMethod).toBe("PUT");
    expect(JSON.parse(capturedBody)).toEqual({ content: "Updated" });
    expect(result.content).toBe("Updated");
  });

  test("delete() DELETEs global message URL", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: { ok: true } };
    });

    await client.messages.delete("msg-1");
    expect(capturedUrl).toContain("/api/messages/msg-1");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(capturedMethod).toBe("DELETE");
  });

  test("reply() POSTs to thread replies URL", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 201, body: fakeMessage };
    });

    const result = await client.messages.reply("ch-1", "parent-1", { content: "Reply" });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/parent-1/replies");
    expect(JSON.parse(capturedBody)).toEqual({ content: "Reply" });
    expect(result.id).toBe("msg-1");
  });

  test("listReplies() GETs thread replies with pagination", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeListResponse };
    });

    const result = await client.messages.listReplies("ch-1", "parent-1", { cursor: "cur-1", limit: 10 });
    const url = new URL(capturedUrl);
    expect(url.pathname).toBe("/api/workspaces/test-ws/channels/ch-1/messages/parent-1/replies");
    expect(url.searchParams.get("cursor")).toBe("cur-1");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(result.messages).toHaveLength(1);
  });

  test("throws OpenSlaqApiError on 401", async () => {
    const client = createClient(() => ({
      status: 401,
      ok: false,
      body: { error: "Unauthorized" },
    }));

    try {
      await client.messages.list("ch-1");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      const err = e as OpenSlaqApiError;
      expect(err.status).toBe(401);
      expect(err.errorMessage).toBe("Unauthorized");
    }
  });

  test("toggleReaction() POSTs emoji to reactions endpoint", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: { reactions: [{ emoji: "👍", count: 1, userIds: ["user-1"] }] } };
    });

    const result = await client.messages.toggleReaction("msg-1", "👍");
    expect(capturedUrl).toContain("/api/messages/msg-1/reactions");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(JSON.parse(capturedBody)).toEqual({ emoji: "👍" });
    expect(result.reactions).toHaveLength(1);
    expect(result.reactions[0]!.emoji).toBe("👍");
  });

  test("pin() POSTs to pin endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: { ok: true } };
    });

    await client.messages.pin("ch-1", "msg-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/msg-1/pin");
    expect(capturedMethod).toBe("POST");
  });

  test("unpin() DELETEs pin endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: { ok: true } };
    });

    await client.messages.unpin("ch-1", "msg-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/msg-1/pin");
    expect(capturedMethod).toBe("DELETE");
  });

  test("listPinned() GETs pins endpoint", async () => {
    let capturedUrl = "";
    const fakePinned = { messages: [fakeMessage] };
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakePinned };
    });

    const result = await client.messages.listPinned("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/pins");
    expect(result.messages).toHaveLength(1);
  });

  test("getPinCount() GETs pin-count endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: { count: 3 } };
    });

    const result = await client.messages.getPinCount("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/pin-count");
    expect(result.count).toBe(3);
  });

  test("throws OpenSlaqApiError on 404", async () => {
    const client = createClient(() => ({
      status: 404,
      ok: false,
      body: { error: "Not found" },
    }));

    try {
      await client.messages.get("nonexistent");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      expect((e as OpenSlaqApiError).status).toBe(404);
    }
  });

  test("save() POSTs to save endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: { ok: true } };
    });

    await client.messages.save("ch-1", "msg-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/msg-1/save");
    expect(capturedMethod).toBe("POST");
  });

  test("unsave() DELETEs save endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: { ok: true } };
    });

    await client.messages.unsave("ch-1", "msg-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/msg-1/save");
    expect(capturedMethod).toBe("DELETE");
  });

  test("listSaved() GETs saved-messages endpoint", async () => {
    let capturedUrl = "";
    const fakeSaved: SavedMessagesResponse = {
      messages: [{ message: fakeMessage, channelName: "general", savedAt: "2026-03-12T00:00:00Z" }],
    };
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeSaved };
    });

    const result = await client.messages.listSaved();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/saved-messages");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.channelName).toBe("general");
  });

  test("listSavedIds() GETs saved-messages/ids endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: { messageIds: ["msg-1", "msg-2"] } };
    });

    const result = await client.messages.listSavedIds();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/saved-messages/ids");
    expect(result.messageIds).toEqual(["msg-1", "msg-2"]);
  });

  test("share() POSTs to share endpoint with body", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 201, body: fakeMessage };
    });

    const result = await client.messages.share("ch-1", { sharedMessageId: "msg-99", comment: "Check this out" });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/share");
    expect(JSON.parse(capturedBody)).toEqual({ sharedMessageId: "msg-99", comment: "Check this out" });
    expect(result.id).toBe("msg-1");
  });

  test("getAround() GETs messages around endpoint", async () => {
    let capturedUrl = "";
    const fakeAround: MessagesAroundResponse = {
      messages: [fakeMessage],
      targetFound: true,
      olderCursor: null,
      newerCursor: null,
      hasOlder: false,
      hasNewer: false,
    };
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeAround };
    });

    const result = await client.messages.getAround("ch-1", "msg-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/messages/around/msg-1");
    expect(result.targetFound).toBe(true);
    expect(result.messages).toHaveLength(1);
  });
});
