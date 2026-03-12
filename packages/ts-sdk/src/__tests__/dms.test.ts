import { describe, expect, test } from "bun:test";
import type { DmChannel, OpenDmResponse } from "../types";
import { createClient } from "./test-utils";

const fakeDmChannel: DmChannel = {
  channel: {
    id: "ch-dm-1",
    workspaceId: "ws-1",
    name: "dm-user1-user2",
    type: "dm",
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
  },
  otherUser: {
    id: "user-2",
    displayName: "Bob",
    email: "bob@test.com",
    avatarUrl: null,
  },
};

const fakeOpenDmResponse: OpenDmResponse = {
  channel: fakeDmChannel.channel,
  otherUser: fakeDmChannel.otherUser,
};

describe("Dms resource", () => {
  test("open() POSTs userId to /dm", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: fakeOpenDmResponse };
    });

    const result = await client.dms.open("user-2");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/dm");
    expect(JSON.parse(capturedBody)).toEqual({ userId: "user-2" });
    expect(result.channel.id).toBe("ch-dm-1");
    expect(result.otherUser?.displayName).toBe("Bob");
  });

  test("list() GETs /dm", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakeDmChannel] };
    });

    const result = await client.dms.list();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/dm");
    expect(result).toHaveLength(1);
    expect(result[0]!.otherUser.id).toBe("user-2");
  });

  test("list() returns empty array when no DMs", async () => {
    const client = createClient(() => ({ status: 200, body: [] }));
    const result = await client.dms.list();
    expect(result).toHaveLength(0);
  });
});
