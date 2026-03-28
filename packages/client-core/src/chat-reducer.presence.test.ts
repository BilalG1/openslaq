import { describe, test, expect } from "bun:test";
import { chatReducer, initialState, type ChatAction } from "./chat-reducer";

describe("chat-reducer presence handling", () => {
  test("presence/sync creates complete entries with status fields", () => {
    const state = chatReducer(initialState, {
      type: "presence/sync",
      users: [
        { userId: "u-1", online: true, lastSeenAt: null },
      ],
    } as ChatAction);

    const entry = state.presence["u-1"];
    expect(entry).toBeDefined();
    expect(entry!.online).toBe(true);
    expect(entry!.statusEmoji).toBeNull();
    expect(entry!.statusText).toBeNull();
    expect(entry!.statusExpiresAt).toBeNull();
  });

  test("presence/updated preserves status fields for known users", () => {
    // First sync with status
    let state = chatReducer(initialState, {
      type: "presence/sync",
      users: [
        {
          userId: "u-1",
          online: true,
          lastSeenAt: null,
          statusEmoji: "🎉",
          statusText: "Celebrating",
          statusExpiresAt: null,
        },
      ],
    } as ChatAction);

    // Then presence update (goes offline)
    state = chatReducer(state, {
      type: "presence/updated",
      userId: "u-1",
      online: false,
      lastSeenAt: "2026-01-01T00:00:00Z",
    } as ChatAction);

    const entry = state.presence["u-1"];
    expect(entry!.online).toBe(false);
    expect(entry!.lastSeenAt).toBe("2026-01-01T00:00:00Z");
    // Status should be preserved from the sync
    expect(entry!.statusEmoji).toBe("🎉");
    expect(entry!.statusText).toBe("Celebrating");
  });

  test("presence/updated for unknown user creates complete entry with defaults", () => {
    // No prior sync — user comes online directly
    const state = chatReducer(initialState, {
      type: "presence/updated",
      userId: "u-new",
      online: true,
      lastSeenAt: null,
    } as ChatAction);

    const entry = state.presence["u-new"];
    expect(entry).toBeDefined();
    expect(entry!.online).toBe(true);
    expect(entry!.lastSeenAt).toBeNull();

    // These should have null defaults, but currently they're undefined
    // because ...existing is a no-op when existing is undefined
    expect(entry!.statusEmoji).toBeNull();
    expect(entry!.statusText).toBeNull();
    expect(entry!.statusExpiresAt).toBeNull();
  });

  test("user/statusUpdated for unknown user creates complete entry", () => {
    const state = chatReducer(initialState, {
      type: "user/statusUpdated",
      userId: "u-new",
      statusEmoji: "🔥",
      statusText: "On fire",
      statusExpiresAt: null,
    } as ChatAction);

    const entry = state.presence["u-new"];
    expect(entry).toBeDefined();
    // Should default to offline with null lastSeenAt
    expect(entry!.online).toBe(false);
    expect(entry!.lastSeenAt).toBeNull();
    expect(entry!.statusEmoji).toBe("🔥");
  });
});
