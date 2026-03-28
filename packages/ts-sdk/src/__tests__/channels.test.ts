import { describe, expect, test } from "bun:test";
import type { BrowseChannel, Channel, ChannelMember } from "../types";
import { createClient } from "./test-utils";

const fakeChannel: Channel = {
  id: "ch-1",
  workspaceId: "ws-1",
  name: "general",
  type: "public",
  description: "General discussion",
  displayName: null,
  isArchived: false,
  createdBy: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  memberCount: 5,
};

const fakeBrowseChannel: BrowseChannel = {
  ...fakeChannel,
  isMember: true,
};

const fakeMember: ChannelMember = {
  id: "user-1",
  displayName: "Alice",
  email: "alice@test.com",
  avatarUrl: null,
  joinedAt: "2026-01-01T00:00:00Z",
};

describe("Channels resource", () => {
  test("list() GETs workspace channels", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakeChannel] };
    });

    const result = await client.channels.list();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("general");
  });

  test("browse() GETs with includeArchived query param", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakeBrowseChannel] };
    });

    const result = await client.channels.browse({ includeArchived: true });
    const url = new URL(capturedUrl);
    expect(url.pathname).toBe("/api/workspaces/test-ws/channels/browse");
    expect(url.searchParams.get("includeArchived")).toBe("true");
    expect(result[0]!.isMember).toBe(true);
  });

  test("browse() works without options", async () => {
    const client = createClient(() => ({ status: 200, body: [fakeBrowseChannel] }));
    const result = await client.channels.browse();
    expect(result).toHaveLength(1);
  });

  test("create() POSTs with name, description, type", async () => {
    let capturedBody = "";
    const client = createClient((_url, init) => {
      capturedBody = init?.body as string;
      return { status: 201, body: fakeChannel };
    });

    const result = await client.channels.create({ name: "general", description: "General discussion", type: "public" });
    expect(JSON.parse(capturedBody)).toEqual({ name: "general", description: "General discussion", type: "public" });
    expect(result.name).toBe("general");
  });

  test("update() PATCHes channel", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body as string;
      return { status: 200, body: { ...fakeChannel, description: "Updated" } };
    });

    const result = await client.channels.update("ch-1", { description: "Updated" as string | null });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1");
    expect(capturedMethod).toBe("PATCH");
    expect(JSON.parse(capturedBody)).toEqual({ description: "Updated" });
    expect(result.description).toBe("Updated");
  });

  test("archive() POSTs to archive endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: undefined };
    });

    await client.channels.archive("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/archive");
    expect(capturedMethod).toBe("POST");
  });

  test("unarchive() POSTs to unarchive endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: undefined };
    });

    await client.channels.unarchive("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/unarchive");
  });

  test("join() POSTs to join endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: undefined };
    });

    await client.channels.join("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/join");
  });

  test("leave() POSTs to leave endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: undefined };
    });

    await client.channels.leave("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/leave");
  });

  test("listMembers() GETs channel members", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakeMember] };
    });

    const result = await client.channels.listMembers("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/members");
    expect(result[0]!.displayName).toBe("Alice");
  });

  test("addMember() POSTs userId to members endpoint", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: undefined };
    });

    await client.channels.addMember("ch-1", "user-2");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/members");
    expect(JSON.parse(capturedBody)).toEqual({ userId: "user-2" });
  });

  test("removeMember() DELETEs member", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: undefined };
    });

    await client.channels.removeMember("ch-1", "user-2");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/members/user-2");
    expect(capturedMethod).toBe("DELETE");
  });

  test("listStarred() GETs starred channel IDs", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: ["ch-1", "ch-2"] };
    });

    const result = await client.channels.listStarred();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/starred");
    expect(result).toEqual(["ch-1", "ch-2"]);
  });

  test("star() POSTs to star endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: undefined };
    });

    await client.channels.star("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/star");
  });

  test("unstar() DELETEs star", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: undefined };
    });

    await client.channels.unstar("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/star");
    expect(capturedMethod).toBe("DELETE");
  });

  test("markRead() POSTs to read endpoint", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: undefined };
    });

    await client.channels.markRead("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/read");
  });

  test("markUnread() POSTs messageId to mark-unread endpoint", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: { ok: true, unreadCount: 3 } };
    });

    const result = await client.channels.markUnread("ch-1", { messageId: "msg-5" });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/mark-unread");
    expect(JSON.parse(capturedBody)).toEqual({ messageId: "msg-5" });
    expect(result.unreadCount).toBe(3);
  });

  test("listNotificationPrefs() GETs notification prefs", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: { "ch-1": "all", "ch-2": "muted" } };
    });

    const result = await client.channels.listNotificationPrefs();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/notification-prefs");
    expect(result["ch-1"]).toBe("all");
    expect(result["ch-2"]).toBe("muted");
  });

  test("getNotificationPref() GETs single channel notification pref", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: { level: "mentions" } };
    });

    const result = await client.channels.getNotificationPref("ch-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/notification-pref");
    expect(result.level).toBe("mentions");
  });

  test("setNotificationPref() PUTs level", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body as string;
      return { status: 200, body: undefined };
    });

    await client.channels.setNotificationPref("ch-1", { level: "mentions" });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/channels/ch-1/notification-pref");
    expect(capturedMethod).toBe("PUT");
    expect(JSON.parse(capturedBody)).toEqual({ level: "mentions" });
  });
});
