import { describe, test, expect } from "bun:test";
import { asEmojiId, asWorkspaceId, asUserId } from "@openslaq/shared";
import { chatReducer, initialState } from "../../chat-reducer";
import type { CustomEmoji } from "@openslaq/shared";

const emoji1: CustomEmoji = {
  id: asEmojiId("e1"),
  workspaceId: asWorkspaceId("w1"),
  name: "party-parrot",
  url: "https://cdn.example.com/emoji/party-parrot.png",
  uploadedBy: asUserId("u1"),
  createdAt: "2026-01-01T00:00:00.000Z",
};

const emoji2: CustomEmoji = {
  id: asEmojiId("e2"),
  workspaceId: asWorkspaceId("w1"),
  name: "pepe-cry",
  url: "https://cdn.example.com/emoji/pepe-cry.png",
  uploadedBy: asUserId("u2"),
  createdAt: "2026-01-02T00:00:00.000Z",
};

describe("emoji reducer actions", () => {
  test("emoji/set replaces all emoji", () => {
    const state = chatReducer(initialState, {
      type: "emoji/set",
      emojis: [emoji1, emoji2],
    });
    expect(state.customEmojis).toHaveLength(2);
    expect(state.customEmojis[0]!.name).toBe("party-parrot");
    expect(state.customEmojis[1]!.name).toBe("pepe-cry");
  });

  test("emoji/add appends a new emoji", () => {
    const state1 = chatReducer(initialState, { type: "emoji/set", emojis: [emoji1] });
    const state2 = chatReducer(state1, { type: "emoji/add", emoji: emoji2 });
    expect(state2.customEmojis).toHaveLength(2);
  });

  test("emoji/add is idempotent (no duplicates)", () => {
    const state1 = chatReducer(initialState, { type: "emoji/set", emojis: [emoji1] });
    const state2 = chatReducer(state1, { type: "emoji/add", emoji: emoji1 });
    expect(state2.customEmojis).toHaveLength(1);
  });

  test("emoji/remove deletes an emoji by id", () => {
    const state1 = chatReducer(initialState, { type: "emoji/set", emojis: [emoji1, emoji2] });
    const state2 = chatReducer(state1, { type: "emoji/remove", emojiId: "e1" });
    expect(state2.customEmojis).toHaveLength(1);
    expect(state2.customEmojis[0]!.name).toBe("pepe-cry");
  });

  test("emoji/remove with unknown id is a no-op", () => {
    const state1 = chatReducer(initialState, { type: "emoji/set", emojis: [emoji1] });
    const state2 = chatReducer(state1, { type: "emoji/remove", emojiId: "unknown" });
    expect(state2.customEmojis).toHaveLength(1);
  });

  test("workspace/bootstrapStart resets emoji on workspace switch", () => {
    const state1 = chatReducer(
      { ...initialState, workspaceSlug: "old-ws", customEmojis: [emoji1] },
      { type: "workspace/bootstrapStart", workspaceSlug: "new-ws" },
    );
    expect(state1.customEmojis).toEqual([]);
  });

  test("workspace/bootstrapStart keeps emoji for same workspace", () => {
    const state1 = chatReducer(
      { ...initialState, workspaceSlug: "same-ws", customEmojis: [emoji1] },
      { type: "workspace/bootstrapStart", workspaceSlug: "same-ws" },
    );
    expect(state1.customEmojis).toEqual([emoji1]);
  });
});
