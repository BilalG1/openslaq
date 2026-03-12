import { describe, test, expect, spyOn } from "bun:test";
import {
  asChannelId,
  asWorkspaceId,
  asUserId,
  asMessageId,
} from "@openslaq/shared";
import type { Channel, Message, SearchResultItem } from "@openslaq/shared";
import type { WorkspaceListItem } from "@openslaq/client-core";
import {
  formatChannelTable,
  formatWorkspaceTable,
  formatSearchResults,
  formatDmTable,
  formatMessages,
  formatScheduledMessages,
  formatUnreadCounts,
  formatBrowseChannelTable,
  formatMemberTable,
  formatInviteTable,
  printHelp,
} from "../src/output";

// ── helpers ──────────────────────────────────────────────────────────

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: asChannelId("ch-1"),
    workspaceId: asWorkspaceId("ws-1"),
    name: "general",
    type: "public",
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("u-1"),
    content: "hello world",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt: "2026-01-01T12:00:00Z",
    updatedAt: "2026-01-01T12:00:00Z",
    ...overrides,
  } as Message;
}

function makeSearchResult(
  overrides: Partial<SearchResultItem> = {},
): SearchResultItem {
  return {
    messageId: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    channelName: "general",
    channelType: "public",
    userId: asUserId("u-1"),
    userDisplayName: "Alice",
    content: "hello",
    headline: "hello",
    parentMessageId: null,
    createdAt: "2026-01-01T12:00:00Z",
    rank: 1,
    ...overrides,
  };
}

// ── formatChannelTable ──────────────────────────────────────────────

describe("formatChannelTable", () => {
  test("empty → 'No channels found.'", () => {
    expect(formatChannelTable([])).toBe("No channels found.");
  });

  test("single channel with padding", () => {
    const out = formatChannelTable([makeChannel({ memberCount: 5 })]);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^NAME\s+TYPE\s+MEMBERS$/);
    expect(lines[1]).toContain("general");
    expect(lines[1]).toContain("public");
    expect(lines[1]).toContain("5");
  });

  test("memberCount undefined → '-'", () => {
    const out = formatChannelTable([makeChannel({ memberCount: undefined })]);
    const lines = out.split("\n");
    expect(lines[1]).toContain("-");
  });
});

// ── formatWorkspaceTable ────────────────────────────────────────────

describe("formatWorkspaceTable", () => {
  test("empty → 'No workspaces found.'", () => {
    expect(formatWorkspaceTable([])).toBe("No workspaces found.");
  });

  test("correct padding and fields", () => {
    const ws: WorkspaceListItem = {
      id: asWorkspaceId("ws-1"),
      name: "My Workspace",
      slug: "my-ws",
      createdAt: "2026-01-01T00:00:00Z",
      role: "admin",
      memberCount: 42,
    };
    const out = formatWorkspaceTable([ws]);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^NAME\s+SLUG\s+ROLE\s+MEMBERS$/);
    expect(lines[1]).toContain("My Workspace");
    expect(lines[1]).toContain("my-ws");
    expect(lines[1]).toContain("admin");
    expect(lines[1]).toContain("42");
  });
});

// ── formatSearchResults ─────────────────────────────────────────────

describe("formatSearchResults", () => {
  test("empty → 'No results found.'", () => {
    expect(formatSearchResults([])).toBe("No results found.");
  });

  test("strips <mark> tags", () => {
    const out = formatSearchResults([
      makeSearchResult({ headline: "foo <mark>bar</mark> baz" }),
    ]);
    expect(out).not.toContain("<mark>");
    expect(out).not.toContain("</mark>");
    expect(out).toContain("foo bar baz");
  });

  test("strips multiple <mark> tags", () => {
    const out = formatSearchResults([
      makeSearchResult({
        headline: "<mark>a</mark> and <mark>b</mark>",
      }),
    ]);
    expect(out).toContain("a and b");
    expect(out).not.toContain("<mark>");
  });
});

// ── formatDmTable ───────────────────────────────────────────────────

describe("formatDmTable", () => {
  test("empty → 'No DM conversations.'", () => {
    expect(formatDmTable([])).toBe("No DM conversations.");
  });

  test("displayName padded to 20", () => {
    const out = formatDmTable([
      {
        channel: { id: "dm-ch-1" },
        otherUser: { id: "u-2", displayName: "Bob" },
      },
    ]);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^USER\s+CHANNEL ID$/);
    expect(lines[1]).toContain("Bob");
    expect(lines[1]).toContain("dm-ch-1");
  });
});

// ── formatMessages ──────────────────────────────────────────────────

describe("formatMessages", () => {
  test("empty → 'No messages.'", () => {
    expect(formatMessages([])).toBe("No messages.");
  });

  test("uses senderDisplayName", () => {
    const out = formatMessages([
      makeMessage({ senderDisplayName: "Alice", content: "hi" }),
    ]);
    expect(out).toContain("@Alice");
    expect(out).toContain("hi");
  });

  test("falls back to 'unknown' when senderDisplayName undefined", () => {
    const out = formatMessages([
      makeMessage({ senderDisplayName: undefined, content: "test" }),
    ]);
    expect(out).toContain("@unknown");
  });
});

// ── formatScheduledMessages ─────────────────────────────────────────

describe("formatScheduledMessages", () => {
  test("empty → 'No scheduled messages.'", () => {
    expect(formatScheduledMessages([])).toBe("No scheduled messages.");
  });

  test("content exactly 40 chars → no truncation", () => {
    const content = "a".repeat(40);
    const out = formatScheduledMessages([
      {
        channelName: "general",
        scheduledFor: "2026-01-01T12:00:00Z",
        status: "pending",
        content,
      },
    ]);
    expect(out).toContain(content);
    expect(out).not.toContain("...");
  });

  test("content 41 chars → truncated to 37 + '...'", () => {
    const content = "a".repeat(41);
    const out = formatScheduledMessages([
      {
        channelName: "general",
        scheduledFor: "2026-01-01T12:00:00Z",
        status: "pending",
        content,
      },
    ]);
    expect(out).toContain("a".repeat(37) + "...");
    expect(out).not.toContain("a".repeat(41));
  });
});

// ── formatUnreadCounts ──────────────────────────────────────────────

describe("formatUnreadCounts", () => {
  test("all zeros → 'All caught up!'", () => {
    const out = formatUnreadCounts(
      { "ch-1": 0, "ch-2": 0 },
      new Map(),
    );
    expect(out).toBe("All caught up!");
  });

  test("maps channel IDs to names", () => {
    const out = formatUnreadCounts(
      { "ch-1": 3 },
      new Map([["ch-1", "general"]]),
    );
    expect(out).toBe("#general  3 unread");
  });

  test("falls back to raw ID when name not found", () => {
    const out = formatUnreadCounts({ "ch-99": 1 }, new Map());
    expect(out).toBe("#ch-99  1 unread");
  });
});

// ── formatBrowseChannelTable ────────────────────────────────────────

describe("formatBrowseChannelTable", () => {
  test("empty → 'No channels found.'", () => {
    expect(formatBrowseChannelTable([])).toBe("No channels found.");
  });

  test("isMember true → 'yes', false → 'no'", () => {
    const out = formatBrowseChannelTable([
      { name: "alpha", type: "public", memberCount: 5, isMember: true },
      { name: "beta", type: "private", memberCount: null, isMember: false },
    ]);
    const lines = out.split("\n");
    expect(lines[1]).toContain("yes");
    expect(lines[2]).toContain("no");
  });

  test("null memberCount → '-'", () => {
    const out = formatBrowseChannelTable([
      { name: "test", type: "public", memberCount: null, isMember: false },
    ]);
    const lines = out.split("\n");
    expect(lines[1]).toContain("-");
  });
});

// ── formatMemberTable ───────────────────────────────────────────────

describe("formatMemberTable", () => {
  test("empty → 'No members found.'", () => {
    expect(formatMemberTable([])).toBe("No members found.");
  });

  test("correct padding", () => {
    const out = formatMemberTable([
      { displayName: "Alice", email: "alice@test.com", role: "admin" },
    ]);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^NAME\s+EMAIL\s+ROLE$/);
    expect(lines[1]).toContain("Alice");
    expect(lines[1]).toContain("alice@test.com");
    expect(lines[1]).toContain("admin");
  });
});

// ── formatInviteTable ───────────────────────────────────────────────

describe("formatInviteTable", () => {
  test("empty → 'No invites found.'", () => {
    expect(formatInviteTable([])).toBe("No invites found.");
  });

  test("revokedAt set → 'revoked', null → 'active'", () => {
    const out = formatInviteTable([
      {
        code: "ABC123",
        maxUses: 10,
        useCount: 2,
        expiresAt: null,
        revokedAt: "2026-01-01T00:00:00Z",
      },
      {
        code: "DEF456",
        maxUses: null,
        useCount: 0,
        expiresAt: null,
        revokedAt: null,
      },
    ]);
    const lines = out.split("\n");
    expect(lines[1]).toContain("revoked");
    expect(lines[2]).toContain("active");
  });

  test("expiresAt null → 'never', maxUses null → '∞'", () => {
    const out = formatInviteTable([
      {
        code: "XYZ",
        maxUses: null,
        useCount: 0,
        expiresAt: null,
        revokedAt: null,
      },
    ]);
    const lines = out.split("\n");
    expect(lines[1]).toContain("never");
    expect(lines[1]).toContain("∞");
  });
});

// ── printHelp ───────────────────────────────────────────────────────

describe("printHelp", () => {
  test("prints usage, description, and flags", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    try {
      printHelp("openslaq test", "Test description", [
        { name: "--foo", desc: "Foo flag" },
      ]);
      const output = spy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Test description");
      expect(output).toContain("Usage: openslaq test");
      expect(output).toContain("Flags:");
      expect(output).toContain("--foo");
      expect(output).toContain("Foo flag");
    } finally {
      spy.mockRestore();
    }
  });

  test("call without flags", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    try {
      printHelp("openslaq test", "Test description");
      const output = spy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Test description");
      expect(output).toContain("Usage: openslaq test");
      expect(output).not.toContain("Flags:");
    } finally {
      spy.mockRestore();
    }
  });
});
