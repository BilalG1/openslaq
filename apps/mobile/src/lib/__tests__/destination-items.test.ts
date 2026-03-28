import { buildDestinationItems } from "../destination-items";
import type { Channel } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";

function makeChannel(overrides: Record<string, unknown> & { id: string; name: string }): Channel {
  return {
    type: "public",
    workspaceId: "ws1",
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    topic: null,
    description: null,
    memberCount: 1,
    ...overrides,
  } as unknown as Channel;
}

function makeDm(id: string, displayName: string): DmConversation {
  return {
    channel: { id, name: "", type: "dm" } as unknown as Channel,
    otherUser: { id: "u-other", displayName, avatarUrl: null },
  } as unknown as DmConversation;
}

function makeGroupDm(
  id: string,
  members: { displayName: string }[],
  channelDisplayName?: string,
): GroupDmConversation {
  return {
    channel: {
      id,
      name: "",
      type: "group_dm",
      displayName: channelDisplayName ?? null,
    } as unknown as Channel,
    members: members.map((m) => ({ id: "u", displayName: m.displayName, avatarUrl: null })),
  } as unknown as GroupDmConversation;
}

describe("buildDestinationItems", () => {
  it("maps public channels", () => {
    const channels = [makeChannel({ id: "c1", name: "general", type: "public" })];
    const result = buildDestinationItems(channels, []);
    expect(result).toEqual([{ id: "c1", name: "general", type: "public" }]);
  });

  it("maps private channels", () => {
    const channels = [makeChannel({ id: "c2", name: "secret", type: "private" })];
    const result = buildDestinationItems(channels, []);
    expect(result).toEqual([{ id: "c2", name: "secret", type: "private" }]);
  });

  it("maps DM conversations", () => {
    const dms = [makeDm("dm1", "Alice")];
    const result = buildDestinationItems([], dms);
    expect(result).toEqual([{ id: "dm1", name: "Alice", type: "dm" }]);
  });

  it("maps group DMs with channel displayName", () => {
    const groupDms = [makeGroupDm("g1", [{ displayName: "A" }, { displayName: "B" }], "Team Chat")];
    const result = buildDestinationItems([], [], groupDms);
    expect(result).toEqual([{ id: "g1", name: "Team Chat", type: "dm" }]);
  });

  it("maps group DMs falling back to joined member names", () => {
    const groupDms = [makeGroupDm("g2", [{ displayName: "Alice" }, { displayName: "Bob" }])];
    const result = buildDestinationItems([], [], groupDms);
    expect(result).toEqual([{ id: "g2", name: "Alice, Bob", type: "dm" }]);
  });

  it("combines channels, dms, and group dms in order", () => {
    const channels = [makeChannel({ id: "c1", name: "general" })];
    const dms = [makeDm("dm1", "Alice")];
    const groupDms = [makeGroupDm("g1", [{ displayName: "X" }], "Group")];

    const result = buildDestinationItems(channels, dms, groupDms);

    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe("c1");
    expect(result[1]!.id).toBe("dm1");
    expect(result[2]!.id).toBe("g1");
  });

  it("returns empty array when all inputs are empty", () => {
    expect(buildDestinationItems([], [])).toEqual([]);
  });

  it("handles undefined groupDms", () => {
    const result = buildDestinationItems([], [], undefined);
    expect(result).toEqual([]);
  });
});
