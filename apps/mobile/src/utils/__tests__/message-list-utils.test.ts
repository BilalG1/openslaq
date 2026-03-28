import {
  shouldShowDaySeparator,
  shouldGroupMessages,
  getActiveStatusEmoji,
  formatDayLabel,
  formatHuddleDuration,
  getInitials,
  isMessageEdited,
} from "../message-list-utils";
import type { Message } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    content: "hello",
    createdAt: "2025-06-15T12:00:00Z",
    updatedAt: "2025-06-15T12:00:00Z",
    parentMessageId: null,
    latestReplyAt: null,
    reactions: [],
    replyCount: 0,
    attachments: [],
    mentions: [],
    ...overrides,
  } as Message;
}

// --------------- shouldShowDaySeparator ---------------

describe("shouldShowDaySeparator", () => {
  it("returns true when there is no previous message", () => {
    expect(shouldShowDaySeparator(undefined, makeMessage())).toBe(true);
  });

  it("returns false when both messages are on the same day", () => {
    const prev = makeMessage({ createdAt: "2025-06-15T10:00:00Z" });
    const curr = makeMessage({ createdAt: "2025-06-15T14:00:00Z" });
    expect(shouldShowDaySeparator(prev, curr)).toBe(false);
  });

  it("returns true when messages are on different days", () => {
    const prev = makeMessage({ createdAt: "2025-06-14T10:00:00Z" });
    const curr = makeMessage({ createdAt: "2025-06-15T10:00:00Z" });
    expect(shouldShowDaySeparator(prev, curr)).toBe(true);
  });
});

// --------------- shouldGroupMessages ---------------

describe("shouldGroupMessages", () => {
  it("returns false when there is no previous message", () => {
    expect(shouldGroupMessages(undefined, makeMessage(), false)).toBe(false);
  });

  it("returns false when day separator is shown", () => {
    const prev = makeMessage();
    const curr = makeMessage({ createdAt: "2025-06-15T12:01:00Z" });
    expect(shouldGroupMessages(prev, curr, true)).toBe(false);
  });

  it("returns false when previous is a channel_event", () => {
    const prev = makeMessage({ type: "channel_event" } as Partial<Message>);
    const curr = makeMessage({ createdAt: "2025-06-15T12:01:00Z" });
    expect(shouldGroupMessages(prev, curr, false)).toBe(false);
  });

  it("returns false when current is a huddle message", () => {
    const prev = makeMessage();
    const curr = makeMessage({ type: "huddle", createdAt: "2025-06-15T12:01:00Z" } as Partial<Message>);
    expect(shouldGroupMessages(prev, curr, false)).toBe(false);
  });

  it("returns false when different users", () => {
    const prev = makeMessage({ userId: asUserId("user-1") });
    const curr = makeMessage({ userId: asUserId("user-2"), createdAt: "2025-06-15T12:01:00Z" });
    expect(shouldGroupMessages(prev, curr, false)).toBe(false);
  });

  it("returns false when messages are more than 5 minutes apart", () => {
    const prev = makeMessage({ createdAt: "2025-06-15T12:00:00Z" });
    const curr = makeMessage({ createdAt: "2025-06-15T12:05:01Z" });
    expect(shouldGroupMessages(prev, curr, false)).toBe(false);
  });

  it("returns true when same user within 5 minutes", () => {
    const prev = makeMessage({ createdAt: "2025-06-15T12:00:00Z" });
    const curr = makeMessage({ createdAt: "2025-06-15T12:04:00Z" });
    expect(shouldGroupMessages(prev, curr, false)).toBe(true);
  });

  it("returns true at exactly 4:59 apart (boundary)", () => {
    const prev = makeMessage({ createdAt: "2025-06-15T12:00:00Z" });
    const curr = makeMessage({ createdAt: "2025-06-15T12:04:59Z" });
    expect(shouldGroupMessages(prev, curr, false)).toBe(true);
  });

  it("returns false when messages are reversed and far apart", () => {
    // BUG: diff = current - prev is negative when current is older,
    // and negative is always < GROUPING_THRESHOLD_MS, so they erroneously group
    const prev = makeMessage({ createdAt: "2025-06-15T18:00:00Z" });
    const curr = makeMessage({ createdAt: "2025-06-15T12:00:00Z" }); // 6 hours earlier
    expect(shouldGroupMessages(prev, curr, false)).toBe(false);
  });
});

// --------------- getActiveStatusEmoji ---------------

describe("getActiveStatusEmoji", () => {
  it("returns null when presence is undefined", () => {
    expect(getActiveStatusEmoji(undefined)).toBeNull();
  });

  it("returns null when statusEmoji is not set", () => {
    expect(getActiveStatusEmoji({ statusEmoji: null })).toBeNull();
  });

  it("returns emoji when set and no expiry", () => {
    expect(getActiveStatusEmoji({ statusEmoji: "🎉" })).toBe("🎉");
  });

  it("returns emoji when expiry is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(getActiveStatusEmoji({ statusEmoji: "🔥", statusExpiresAt: future })).toBe("🔥");
  });

  it("returns null when emoji has expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(getActiveStatusEmoji({ statusEmoji: "🔥", statusExpiresAt: past })).toBeNull();
  });
});

// --------------- formatDayLabel ---------------

describe("formatDayLabel", () => {
  const now = new Date("2025-06-15T15:00:00Z");

  it("returns 'Today' for the same day", () => {
    expect(formatDayLabel(new Date("2025-06-15T08:00:00Z"), now)).toBe("Today");
  });

  it("returns 'Yesterday' for the previous day", () => {
    expect(formatDayLabel(new Date("2025-06-14T20:00:00Z"), now)).toBe("Yesterday");
  });

  it("returns formatted date for older dates", () => {
    const result = formatDayLabel(new Date("2025-06-10T12:00:00Z"), now);
    // Should contain day of week and month
    expect(result).toContain("June");
    expect(result).toContain("10");
  });
});

// --------------- formatHuddleDuration ---------------

describe("formatHuddleDuration", () => {
  const baseTime = new Date("2025-06-15T12:00:00Z").getTime();

  it("formats minutes under an hour", () => {
    const startedAt = new Date(baseTime - 25 * 60_000).toISOString();
    expect(formatHuddleDuration(startedAt, baseTime)).toBe("25m");
  });

  it("formats zero minutes", () => {
    const startedAt = new Date(baseTime - 30_000).toISOString();
    expect(formatHuddleDuration(startedAt, baseTime)).toBe("0m");
  });

  it("formats exact hours", () => {
    const startedAt = new Date(baseTime - 2 * 60 * 60_000).toISOString();
    expect(formatHuddleDuration(startedAt, baseTime)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    const startedAt = new Date(baseTime - (1 * 60 + 30) * 60_000).toISOString();
    expect(formatHuddleDuration(startedAt, baseTime)).toBe("1h 30m");
  });
});

// --------------- getInitials ---------------

describe("getInitials", () => {
  it("returns ? for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });

  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns two initials for two-part name", () => {
    expect(getInitials("Alice Bob")).toBe("AB");
  });

  it("handles three-part names using first two", () => {
    expect(getInitials("Alice B Charlie")).toBe("AB");
  });

  it("uppercases initials", () => {
    expect(getInitials("alice bob")).toBe("AB");
  });

  it("handles leading whitespace in name", () => {
    // BUG: " Alice Bob".split(/\s+/) => ["", "Alice", "Bob"]
    // parts[0] is "" so parts[0][0] is undefined, only "A" is returned
    expect(getInitials(" Alice Bob")).toBe("AB");
  });

  it("returns ? for whitespace-only name", () => {
    // BUG: "  " is truthy so !name check passes, but split yields ["", ""]
    // both parts are empty strings, result is "" instead of "?"
    expect(getInitials("  ")).toBe("?");
  });
});

// --------------- isMessageEdited ---------------

describe("isMessageEdited", () => {
  it("returns false when updatedAt equals createdAt", () => {
    expect(isMessageEdited({ createdAt: "2025-06-15T12:00:00Z", updatedAt: "2025-06-15T12:00:00Z" })).toBe(false);
  });

  it("returns true when updatedAt is after createdAt", () => {
    expect(isMessageEdited({ createdAt: "2025-06-15T12:00:00Z", updatedAt: "2025-06-15T12:01:00Z" })).toBe(true);
  });
});
