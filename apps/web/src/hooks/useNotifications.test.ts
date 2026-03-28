import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../test-utils";
import type { Message } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

// --- Mocks ---

const mockDispatch = vi.fn();
let mockChannelNotificationPrefs: Record<string, string> = {};
let mockChannels: Array<{ id: string; name: string }> = [];
let mockDms: Array<{ channel: { id: string }; otherUser: { displayName: string } }> = [];
let mockGroupDms: Array<{ channel: { id: string }; members: Array<{ displayName: string }> }> = [];

vi.mock("../state/chat-store", () => ({
  useChatStore: () => ({
    state: {
      channels: mockChannels,
      dms: mockDms,
      groupDms: mockGroupDms,
      channelNotificationPrefs: mockChannelNotificationPrefs,
    },
    dispatch: mockDispatch,
  }),
}));

vi.mock("./useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1" }),
}));

vi.mock("./useWindowFocused", () => ({
  useWindowFocused: () => false,
}));

// Control getNotificationPreferences() via localStorage (it reads from there directly)
function setMockNotificationPrefs(prefs: { enabled: boolean; sound: boolean }) {
  localStorage.setItem("openslaq-notifications-enabled", String(prefs.enabled));
  localStorage.setItem("openslaq-notifications-sound", String(prefs.sound));
}

vi.mock("../lib/tauri", () => ({
  isTauri: () => false,
}));

const socketHandlers: Record<string, Function> = {};
vi.mock("./useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: Function) => {
    socketHandlers[event] = handler;
  },
}));

// Must import after mocks
import { useNotifications } from "./useNotifications";

// --- Helpers ---

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-2"),
    content: "Hello world",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    senderDisplayName: "Alice",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Message;
}

// Mock browser Notification
let lastNotification: { title: string; body: string; onclick?: () => void } | null = null;

function setupNotificationMock() {
  (globalThis as unknown as Record<string, unknown>).Notification = class {
    title: string;
    body: string;
    onclick: (() => void) | null = null;
    constructor(title: string, opts: { body: string }) {
      this.title = title;
      this.body = opts.body;
      lastNotification = { title, body: opts.body };
      // Capture onclick after construction via arrow (preserves `this`)
      setTimeout(() => {
        if (this.onclick) lastNotification!.onclick = this.onclick;
      }, 0);
    }
    close() {}
    static permission = "granted";
  };
}

// --- Tests ---

describe("useNotifications", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockChannelNotificationPrefs = {};
    mockChannels = [{ id: "ch-1", name: "general" }];
    mockDms = [];
    mockGroupDms = [];
    setMockNotificationPrefs({ enabled: true, sound: false });
    lastNotification = null;
    setupNotificationMock();
    // Reset document.hidden to false (unfocused by default — but we mock useWindowFocused to false)
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
  });

  function renderAndGetHandler() {
    renderHook(() => useNotifications());
    return socketHandlers["message:new"] as (msg: Message) => void;
  }

  test("registers message:new socket handler", () => {
    renderAndGetHandler();
    expect(socketHandlers["message:new"]).toBeDefined();
  });

  test("skips own messages", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ userId: asUserId("user-1") }));
    expect(lastNotification).toBeNull();
  });

  test("skips muted channels", () => {
    mockChannelNotificationPrefs = { "ch-1": "muted" };
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification).toBeNull();
  });

  test("skips non-mentioned messages in mentions-only channels", () => {
    mockChannelNotificationPrefs = { "ch-1": "mentions" };
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification).toBeNull();
  });

  test("allows mentioned messages in mentions-only channels", () => {
    mockChannelNotificationPrefs = { "ch-1": "mentions" };
    const handler = renderAndGetHandler();
    handler(
      makeMessage({
        mentions: [{ userId: asUserId("user-1"), displayName: "Me", type: "user" }],
      }),
    );
    expect(lastNotification).not.toBeNull();
    expect(lastNotification!.title).toContain("mentioned you");
  });

  test("skips thread replies without mentions", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ parentMessageId: asMessageId("parent-1") }));
    expect(lastNotification).toBeNull();
  });

  test("allows thread replies with mentions", () => {
    const handler = renderAndGetHandler();
    handler(
      makeMessage({
        parentMessageId: asMessageId("parent-1"),
        mentions: [{ userId: asUserId("user-1"), displayName: "Me", type: "user" }],
      }),
    );
    expect(lastNotification).not.toBeNull();
  });

  test("skips when app is focused and not mentioned", () => {
    // In non-tauri mode, it reads document.hidden directly
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification).toBeNull();
  });

  test("allows mentioned messages even when focused", () => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const handler = renderAndGetHandler();
    handler(
      makeMessage({
        mentions: [{ userId: asUserId("user-1"), displayName: "Me", type: "user" }],
      }),
    );
    expect(lastNotification).not.toBeNull();
    expect(lastNotification!.title).toContain("mentioned you");
  });

  test("skips when notifications disabled", () => {
    setMockNotificationPrefs({ enabled: false, sound: false });
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification).toBeNull();
  });

  test("shows channel name in notification body", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification).not.toBeNull();
    expect(lastNotification!.body).toContain("#general");
  });

  test("shows DM sender name for DM channels", () => {
    mockChannels = [];
    mockDms = [{ channel: { id: "ch-1" }, otherUser: { displayName: "Bob" } }];
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification!.body).toContain("Bob");
  });

  test("shows group DM member names", () => {
    mockChannels = [];
    mockGroupDms = [
      {
        channel: { id: "ch-1" },
        members: [{ displayName: "Bob" }, { displayName: "Carol" }],
      },
    ];
    const handler = renderAndGetHandler();
    handler(makeMessage());
    expect(lastNotification!.body).toContain("Bob, Carol");
  });

  test("strips markdown from notification body — bold", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "**bold text**" }));
    expect(lastNotification!.body).toContain("bold text");
    expect(lastNotification!.body).not.toContain("**");
  });

  test("strips markdown from notification body — italic", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "*italic text*" }));
    expect(lastNotification!.body).toContain("italic text");
    expect(lastNotification!.body).not.toContain("*italic");
  });

  test("strips markdown from notification body — code", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "`code here`" }));
    expect(lastNotification!.body).toContain("code here");
    expect(lastNotification!.body).not.toContain("`");
  });

  test("strips markdown from notification body — headings", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "## Heading text" }));
    expect(lastNotification!.body).toContain("Heading text");
    expect(lastNotification!.body).not.toContain("##");
  });

  test("strips markdown from notification body — links", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "[click here](https://example.com)" }));
    expect(lastNotification!.body).toContain("click here");
    expect(lastNotification!.body).not.toContain("https://example.com");
  });

  test("strips markdown from notification body — strikethrough", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "~~deleted~~" }));
    expect(lastNotification!.body).toContain("deleted");
    expect(lastNotification!.body).not.toContain("~~");
  });

  test("strips markdown from notification body — mentions", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "Hey <@user-123> check this" }));
    expect(lastNotification!.body).toContain("@mention");
    expect(lastNotification!.body).not.toContain("<@user-123>");
  });

  test("strips multiple formatting in one string", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "**bold** and *italic* with `code`" }));
    expect(lastNotification!.body).toContain("bold and italic with code");
  });

  test("handles empty content", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "" }));
    expect(lastNotification).not.toBeNull();
  });

  test("truncates long content with ellipsis", () => {
    const handler = renderAndGetHandler();
    const longContent = "a".repeat(200);
    handler(makeMessage({ content: longContent }));
    expect(lastNotification!.body).toContain("...");
    // The body format is "#general: <truncated content>"
    // The truncated content should be 100 chars + "..."
    const bodyAfterPrefix = lastNotification!.body.replace("#general: ", "");
    expect(bodyAfterPrefix.length).toBe(103); // 100 + "..."
  });

  test("does not truncate short content", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ content: "short" }));
    expect(lastNotification!.body).not.toContain("...");
  });

  test("mention notification title says 'mentioned you in'", () => {
    const handler = renderAndGetHandler();
    handler(
      makeMessage({
        senderDisplayName: "Alice",
        mentions: [{ userId: asUserId("user-1"), displayName: "Me", type: "user" }],
      }),
    );
    expect(lastNotification!.title).toBe("Alice mentioned you in #general");
  });

  test("non-mention notification title is sender name", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ senderDisplayName: "Alice" }));
    expect(lastNotification!.title).toBe("Alice");
  });

  test("uses 'Someone' when senderDisplayName is missing", () => {
    const handler = renderAndGetHandler();
    handler(makeMessage({ senderDisplayName: undefined }));
    expect(lastNotification!.title).toBe("Someone");
  });
});
