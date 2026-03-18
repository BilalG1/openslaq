import { describe, expect, test } from "bun:test";
import type { PresenceEntry } from "../types";
import { createClient } from "./test-utils";

const fakePresence: PresenceEntry = {
  userId: "user-1",
  online: true,
  lastSeenAt: "2026-01-01T12:00:00Z",
  statusEmoji: "🚀",
  statusText: "Shipping features",
  statusExpiresAt: null,
};

describe("Presence resource", () => {
  test("list() GETs /presence", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: [fakePresence] };
    });

    const result = await client.presence.list();
    expect(capturedUrl).toContain("/api/workspaces/test-ws/presence");
    expect(result).toHaveLength(1);
    expect(result[0]!.userId).toBe("user-1");
    expect(result[0]!.online).toBe(true);
    expect(result[0]!.statusEmoji).toBe("🚀");
  });

  test("list() returns empty array when no presence data", async () => {
    const client = createClient(() => ({ status: 200, body: [] }));
    const result = await client.presence.list();
    expect(result).toHaveLength(0);
  });
});
