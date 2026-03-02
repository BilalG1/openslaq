import { describe, expect, it } from "bun:test";
import {
  normalizeWorkspaceInfo,
  normalizeChannel,
  normalizeDmConversation,
  normalizeGroupDmConversation,
  normalizeMessage,
  normalizeCursor,
} from "../normalize";

describe("normalizeWorkspaceInfo", () => {
  it("maps raw workspace to typed WorkspaceInfo", () => {
    const raw = {
      id: "ws-1",
      name: "My Workspace",
      slug: "my-workspace",
      createdAt: "2026-01-01T00:00:00.000Z",
      role: "admin",
    };

    const result = normalizeWorkspaceInfo(raw);

    expect(String(result.id)).toBe("ws-1");
    expect(result.name).toBe("My Workspace");
    expect(String(result.slug)).toBe("my-workspace");
    expect(result.role).toBe("admin");
  });
});

describe("normalizeChannel", () => {
  it("handles defaults for displayName and isArchived", () => {
    const raw = {
      id: "ch-1",
      workspaceId: "ws-1",
      name: "general",
      type: "public" as const,
      description: null,
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const result = normalizeChannel(raw);

    expect(String(result.id)).toBe("ch-1");
    expect(result.displayName).toBeNull();
    expect(result.isArchived).toBe(false);
  });

  it("preserves explicit displayName and isArchived", () => {
    const raw = {
      id: "ch-2",
      workspaceId: "ws-1",
      name: "archived-channel",
      type: "public" as const,
      description: "old stuff",
      displayName: "Archived",
      isArchived: true,
      createdBy: "u-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      memberCount: 5,
    };

    const result = normalizeChannel(raw);

    expect(result.displayName).toBe("Archived");
    expect(result.isArchived).toBe(true);
    expect(String(result.createdBy)).toBe("u-1");
    expect(result.memberCount).toBe(5);
  });
});

describe("normalizeDmConversation", () => {
  it("wraps channel and otherUser", () => {
    const raw = {
      channel: {
        id: "dm-1",
        workspaceId: "ws-1",
        name: "dm",
        type: "dm" as const,
        description: null,
        createdBy: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      otherUser: { id: "u-2", displayName: "Alice", avatarUrl: null },
    };

    const result = normalizeDmConversation(raw);

    expect(String(result.channel.id)).toBe("dm-1");
    expect(result.otherUser.displayName).toBe("Alice");
  });
});

describe("normalizeGroupDmConversation", () => {
  it("wraps channel and members", () => {
    const raw = {
      channel: {
        id: "gdm-1",
        workspaceId: "ws-1",
        name: "group",
        type: "group_dm" as const,
        description: null,
        createdBy: "u-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      members: [
        { id: "u-1", displayName: "Alice", avatarUrl: null },
        { id: "u-2", displayName: "Bob", avatarUrl: "https://example.com/bob.png" },
      ],
    };

    const result = normalizeGroupDmConversation(raw);

    expect(String(result.channel.id)).toBe("gdm-1");
    expect(result.members).toHaveLength(2);
    expect(result.members[1]!.displayName).toBe("Bob");
  });
});

describe("normalizeMessage", () => {
  const baseRaw = {
    id: "msg-1",
    channelId: "ch-1",
    userId: "u-1",
    content: "hello",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("normalizes minimal message with empty optional arrays", () => {
    const result = normalizeMessage(baseRaw);

    expect(String(result.id)).toBe("msg-1");
    expect(result.reactions).toEqual([]);
    expect(result.mentions).toEqual([]);
    expect(result.attachments).toEqual([]);
    expect(result.sharedMessage).toBeUndefined();
  });

  it("normalizes reactions", () => {
    const raw = {
      ...baseRaw,
      reactions: [{ emoji: "thumbsup", count: 2, userIds: ["u-1", "u-2"] }],
    };

    const result = normalizeMessage(raw);

    expect(result.reactions).toHaveLength(1);
    expect(result.reactions[0]!.emoji).toBe("thumbsup");
    expect(result.reactions[0]!.userIds.map(String)).toEqual(["u-1", "u-2"]);
  });

  it("normalizes mentions", () => {
    const raw = {
      ...baseRaw,
      mentions: [{ userId: "u-2", displayName: "Alice", type: "user" as const }],
    };

    const result = normalizeMessage(raw);

    expect(result.mentions).toHaveLength(1);
    expect(String(result.mentions[0]!.userId)).toBe("u-2");
  });

  it("normalizes attachments", () => {
    const raw = {
      ...baseRaw,
      attachments: [
        {
          id: "att-1",
          messageId: "msg-1",
          filename: "file.png",
          mimeType: "image/png",
          size: 1024,
          uploadedBy: "u-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          downloadUrl: "https://example.com/file.png",
        },
      ],
    };

    const result = normalizeMessage(raw);

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]!.filename).toBe("file.png");
  });

  it("normalizes sharedMessage", () => {
    const raw = {
      ...baseRaw,
      sharedMessage: {
        id: "msg-shared",
        channelId: "ch-2",
        channelName: "random",
        userId: "u-2",
        senderDisplayName: "Bob",
        senderAvatarUrl: null,
        content: "original",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };

    const result = normalizeMessage(raw);

    expect(result.sharedMessage).toBeDefined();
    expect(String(result.sharedMessage!.id)).toBe("msg-shared");
    expect(result.sharedMessage!.channelName).toBe("random");
  });

  it("normalizes parentMessageId when present", () => {
    const raw = { ...baseRaw, parentMessageId: "msg-parent" };

    const result = normalizeMessage(raw);

    expect(String(result.parentMessageId)).toBe("msg-parent");
  });
});

describe("normalizeCursor", () => {
  it("returns cursor string as-is", () => {
    expect(normalizeCursor("abc")).toBe("abc");
  });

  it("returns null for null", () => {
    expect(normalizeCursor(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeCursor(undefined)).toBeNull();
  });
});
