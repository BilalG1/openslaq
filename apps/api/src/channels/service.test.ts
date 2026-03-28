import { describe, test, expect, mock } from "bun:test";
import type { ChannelId } from "@openslaq/shared";

// Mock database
const mockUpdate = mock(() => ({
  set: mock(() => ({
    where: mock(() => ({
      returning: mock(() => [{
        id: "ch-1",
        workspaceId: "ws-1",
        name: "general",
        type: "public",
        description: "Updated topic",
        displayName: null,
        isArchived: false,
        createdBy: "user-1",
        createdAt: new Date("2026-01-01"),
      }]),
    })),
  })),
}));

const mockSelect = mock(() => ({
  from: mock(() => ({
    where: mock(() => [{ count: 5 }]),
  })),
}));

mock.module("../db", () => ({
  db: {
    update: mockUpdate,
    select: mockSelect,
  },
}));

mock.module("./schema", () => ({
  channels: { id: "id", workspaceId: "workspaceId", description: "description" },
  channelMembers: { channelId: "channelId" },
}));

const { updateChannel } = await import("./service");

describe("updateChannel", () => {
  test("returns channel with memberCount after topic update", async () => {
    const result = await updateChannel("ch-1" as ChannelId, { description: "Updated topic" });
    expect(result.description).toBe("Updated topic");
    expect(result.memberCount).toBeDefined();
    expect(result.memberCount).toBeGreaterThan(0);
  });
});
