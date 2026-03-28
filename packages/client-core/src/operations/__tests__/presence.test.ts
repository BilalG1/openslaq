import { describe, expect, it } from "bun:test";
import { handlePresenceSync, handlePresenceUpdate } from "../presence";

describe("operations/presence", () => {
  it("maps sync payload statuses to online boolean", () => {
    const action = handlePresenceSync({
      users: [
        { userId: "u-1", status: "online", lastSeenAt: null },
        { userId: "u-2", status: "offline", lastSeenAt: "2026-01-01T00:00:00.000Z" },
      ],
    });

    expect(action).toEqual({
      type: "presence/sync",
      users: [
        { userId: "u-1", online: true, lastSeenAt: null, statusEmoji: null, statusText: null, statusExpiresAt: null },
        { userId: "u-2", online: false, lastSeenAt: "2026-01-01T00:00:00.000Z", statusEmoji: null, statusText: null, statusExpiresAt: null },
      ],
    });
  });

  it("maps update payload status to online boolean", () => {
    const action = handlePresenceUpdate({
      userId: "u-1",
      status: "offline",
      lastSeenAt: "2026-01-01T01:00:00.000Z",
    });

    expect(action).toEqual({
      type: "presence/updated",
      userId: "u-1",
      online: false,
      lastSeenAt: "2026-01-01T01:00:00.000Z",
    });
  });
});
