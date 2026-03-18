import { describe, expect, test } from "bun:test";
import { OpenSlaqApiError } from "../index";
import type { ScheduledMessage, ScheduledMessageWithChannel } from "../types";
import { createClient } from "./test-utils";

const fakeScheduled: ScheduledMessage = {
  id: "sched-1",
  channelId: "ch-1",
  userId: "user-1",
  content: "Hello later",
  attachmentIds: [],
  scheduledFor: "2026-03-15T10:00:00Z",
  status: "pending",
  failureReason: null,
  sentMessageId: null,
  createdAt: "2026-03-12T00:00:00Z",
  updatedAt: "2026-03-12T00:00:00Z",
};

const fakeScheduledWithChannel: ScheduledMessageWithChannel = {
  ...fakeScheduled,
  channelName: "general",
};

describe("ScheduledMessages resource", () => {
  test("create() POSTs to scheduled-messages endpoint", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 201, body: fakeScheduled };
    });

    const result = await client.scheduledMessages.create({
      channelId: "ch-1",
      content: "Hello later",
      scheduledFor: "2026-03-15T10:00:00Z",
    });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/scheduled-messages");
    expect(JSON.parse(capturedBody)).toEqual({
      channelId: "ch-1",
      content: "Hello later",
      scheduledFor: "2026-03-15T10:00:00Z",
    });
    expect(result.id).toBe("sched-1");
  });

  test("list() GETs scheduled-messages endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakeScheduledWithChannel] };
    });

    const result = await client.scheduledMessages.list();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/scheduled-messages");
    expect(result).toHaveLength(1);
    expect(result[0]!.channelName).toBe("general");
  });

  test("get() GETs scheduled-messages by id", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeScheduled };
    });

    const result = await client.scheduledMessages.get("sched-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/scheduled-messages/sched-1");
    expect(result.content).toBe("Hello later");
  });

  test("update() PUTs to scheduled-messages by id", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body as string;
      return { status: 200, body: { ...fakeScheduled, content: "Updated" } };
    });

    const result = await client.scheduledMessages.update("sched-1", { content: "Updated" });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/scheduled-messages/sched-1");
    expect(capturedMethod).toBe("PUT");
    expect(JSON.parse(capturedBody)).toEqual({ content: "Updated" });
    expect(result.content).toBe("Updated");
  });

  test("delete() DELETEs scheduled-messages by id", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: { ok: true } };
    });

    await client.scheduledMessages.delete("sched-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/scheduled-messages/sched-1");
    expect(capturedMethod).toBe("DELETE");
  });

  test("countByChannel() GETs channel count endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: { count: 5 } };
    });

    const result = await client.scheduledMessages.countByChannel("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/scheduled-messages/channel/ch-1");
    expect(result.count).toBe(5);
  });

  test("throws OpenSlaqApiError on 404", async () => {
    const client = createClient(() => ({
      status: 404,
      ok: false,
      body: { error: "Not found" },
    }));

    try {
      await client.scheduledMessages.get("nonexistent");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      expect((e as OpenSlaqApiError).status).toBe(404);
    }
  });
});
