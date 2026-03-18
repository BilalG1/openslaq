import { describe, expect, test } from "bun:test";
import type { GroupDmAddMemberResponse, GroupDmChannel } from "../types";
import { createClient } from "./test-utils";

const fakeGroupDmChannel: GroupDmChannel = {
  channel: {
    id: "ch-gdm-1",
    workspaceId: "ws-1",
    name: "group-dm-1",
    type: "group_dm",
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    memberCount: 3,
  },
  members: [
    { id: "user-1", displayName: "Alice", avatarUrl: null },
    { id: "user-2", displayName: "Bob", avatarUrl: null },
    { id: "user-3", displayName: "Charlie", avatarUrl: "https://example.com/charlie.png" },
  ],
};

describe("GroupDms resource", () => {
  test("create() POSTs memberIds to /group-dm", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: fakeGroupDmChannel };
    });

    const result = await client.groupDms.create({ memberIds: ["user-2", "user-3"] });
    expect(capturedUrl).toContain("/api/workspaces/test-ws/group-dm");
    expect(JSON.parse(capturedBody)).toEqual({ memberIds: ["user-2", "user-3"] });
    expect(result.channel.id).toBe("ch-gdm-1");
    expect(result.members).toHaveLength(3);
  });

  test("list() GETs /group-dm", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakeGroupDmChannel] };
    });

    const result = await client.groupDms.list();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/group-dm");
    expect(result).toHaveLength(1);
    expect(result[0]!.members[0]!.displayName).toBe("Alice");
  });

  test("list() returns empty array when no group DMs", async () => {
    const client = createClient(() => ({ status: 200, body: [] }));
    const result = await client.groupDms.list();
    expect(result).toHaveLength(0);
  });

  test("addMember() POSTs userId to /group-dm/:channelId/members", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const fakeResponse: GroupDmAddMemberResponse = {
      members: [...fakeGroupDmChannel.members, { id: "user-4", displayName: "Diana", avatarUrl: null }],
    };
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: fakeResponse };
    });

    const result = await client.groupDms.addMember("ch-gdm-1", "user-4");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/group-dm/ch-gdm-1/members");
    expect(JSON.parse(capturedBody)).toEqual({ userId: "user-4" });
    expect(result.members).toHaveLength(4);
  });

  test("leave() DELETEs /group-dm/:channelId/members/me", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method as string;
      return { status: 200, body: null };
    });

    await client.groupDms.leave("ch-gdm-1");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/group-dm/ch-gdm-1/members/me");
    expect(capturedMethod).toBe("DELETE");
  });

  test("rename() PATCHes displayName to /group-dm/:channelId", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const fakeResponse = { channel: { ...fakeGroupDmChannel.channel, displayName: "Cool Group" } };
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedBody = init?.body as string;
      return { status: 200, body: fakeResponse };
    });

    const result = await client.groupDms.rename("ch-gdm-1", "Cool Group");
    expect(capturedUrl).toContain("/api/workspaces/test-ws/group-dm/ch-gdm-1");
    expect(JSON.parse(capturedBody)).toEqual({ displayName: "Cool Group" });
    expect(result.channel.displayName).toBe("Cool Group");
  });
});
