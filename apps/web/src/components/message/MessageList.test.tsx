import { describe, test, expect, afterEach, beforeEach, jest, mock } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import type { Message, ChannelId, MessageId, UserId, ReactionGroup } from "@openslaq/shared";

// Mock hooks
mock.module("react-router-dom", () => ({
  useParams: () => ({ workspaceSlug: "default" }),
}));

mock.module("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1" }),
}));

mock.module("../../hooks/useSocket", () => ({
  useSocket: () => ({ joinChannel: jest.fn() }),
}));

// Capture socket event handlers so we can invoke them in tests
const socketHandlers: Record<string, Function> = {};
mock.module("../../hooks/useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: Function) => {
    socketHandlers[event] = handler;
  },
}));

mock.module("../../hooks/chat/useChannelMessages", () => ({
  useChannelMessages: () => {},
}));

mock.module("../../hooks/chat/useMessageMutations", () => ({
  useMessageMutations: () => ({
    toggleReaction: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    markAsUnread: jest.fn(),
  }),
}));

// Mutable config objects for pagination mocks
const olderConfig = { loadOlder: jest.fn(), loadingOlder: false, hasOlder: false };
mock.module("../../hooks/chat/useLoadOlderMessages", () => ({
  useLoadOlderMessages: () => olderConfig,
}));

const newerConfig = { loadNewer: jest.fn(), loadingNewer: false, hasNewer: false };
mock.module("../../hooks/chat/useLoadNewerMessages", () => ({
  useLoadNewerMessages: () => newerConfig,
}));

mock.module("../../hooks/chat/useBotActions", () => ({
  useBotActions: () => ({ triggerAction: jest.fn() }),
}));

// Mock only MessageItem — it has complex dependencies.
// Leave DaySeparator, HuddleSystemMessage, EphemeralMessageItem as real components.
mock.module("./MessageItem", () => ({
  MessageItem: ({ message, senderStatusEmoji, isGrouped }: { message: { id: string; content: string }; senderStatusEmoji?: string | null; isGrouped?: boolean }) => (
    <div data-testid={`msg-${message.id}`} data-status-emoji={senderStatusEmoji ?? ""} data-grouped={isGrouped ? "true" : "false"}>
      {message.content}
    </div>
  ),
}));

function makeMessage(id: string, content: string, overrides?: Partial<Message>): Message {
  return {
    id: id as MessageId,
    channelId: "ch-1" as ChannelId,
    userId: "user-1" as UserId,
    content,
    createdAt: "2026-02-27T00:00:00Z",
    updatedAt: "2026-02-27T00:00:00Z",
    type: "message",
    attachments: [],
    reactions: [],
    replyCount: 0,
    isPinned: false,
    isEdited: false,
    parentMessageId: null,
    latestReplyAt: null,
    mentions: [],
    ...overrides,
  } as unknown as Message;
}

const mockDispatch = jest.fn();
const mockState = {
  channelMessageIds: { "ch-1": ["m1", "m2", "m3"] } as Record<string, string[]>,
  messagesById: {
    m1: makeMessage("m1", "Hello"),
    m2: makeMessage("m2", "World"),
    m3: makeMessage("m3", "Test"),
  } as Record<string, Message>,
  ui: {
    channelMessagesLoading: {} as Record<string, boolean>,
    channelMessagesError: {} as Record<string, string | undefined>,
  },
  activeHuddles: {} as Record<string, unknown>,
  presence: {} as Record<string, unknown>,
  customEmojis: [] as unknown[],
};

mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({ state: mockState, dispatch: mockDispatch }),
}));

const { MessageList } = await import("./MessageList");

describe("MessageList", () => {
  beforeEach(() => {
    // Reset state to defaults before each test
    mockState.channelMessageIds = { "ch-1": ["m1", "m2", "m3"] };
    mockState.messagesById = {
      m1: makeMessage("m1", "Hello"),
      m2: makeMessage("m2", "World"),
      m3: makeMessage("m3", "Test"),
    };
    mockState.ui.channelMessagesLoading = {};
    mockState.ui.channelMessagesError = {};
    mockState.activeHuddles = {};
    mockState.presence = {};
    olderConfig.loadingOlder = false;
    olderConfig.hasOlder = false;
    newerConfig.loadingNewer = false;
    newerConfig.hasNewer = false;
    mockDispatch.mockClear();
    // Clear captured handlers
    for (const key of Object.keys(socketHandlers)) {
      delete socketHandlers[key];
    }
  });

  afterEach(cleanup);

  // ── Existing tests ─────────────────────────────────────────────

  test("renders messages", () => {
    render(<MessageList channelId="ch-1" />);

    expect(screen.getByTestId("msg-m1")).toBeTruthy();
    expect(screen.getByTestId("msg-m2")).toBeTruthy();
    expect(screen.getByTestId("msg-m3")).toBeTruthy();
  });

  test("handles message deletion without crashing", () => {
    const { rerender } = render(<MessageList channelId="ch-1" />);

    expect(screen.getByTestId("msg-m1")).toBeTruthy();
    expect(screen.getByTestId("msg-m2")).toBeTruthy();
    expect(screen.getByTestId("msg-m3")).toBeTruthy();

    mockState.channelMessageIds["ch-1"] = ["m1", "m3"];
    delete mockState.messagesById.m2;

    rerender(<MessageList channelId="ch-1" />);

    expect(screen.getByTestId("msg-m1")).toBeTruthy();
    expect(screen.queryByTestId("msg-m2")).toBeNull();
    expect(screen.getByTestId("msg-m3")).toBeTruthy();
  });

  // ── Loading / error / empty states ─────────────────────────────

  test('shows "Loading messages..." when loading', () => {
    mockState.ui.channelMessagesLoading["ch-1"] = true;
    render(<MessageList channelId="ch-1" />);
    expect(screen.getByText("Loading messages...")).toBeTruthy();
  });

  test("shows error text when error is set", () => {
    mockState.ui.channelMessagesError["ch-1"] = "Something went wrong";
    render(<MessageList channelId="ch-1" />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  test('shows "No messages yet" when channelMessageIds is empty and no ephemeral', () => {
    mockState.channelMessageIds["ch-1"] = [];
    render(<MessageList channelId="ch-1" />);
    expect(screen.getByText(/No messages yet/)).toBeTruthy();
  });

  test("shows ephemeral messages when no regular messages", () => {
    mockState.channelMessageIds["ch-1"] = [];
    const ephemeral = [
      { id: "eph-1", text: "Only you can see this", channelId: "ch-1", createdAt: new Date().toISOString() },
    ];
    render(<MessageList channelId="ch-1" ephemeralMessages={ephemeral as any} />);
    // Real EphemeralMessageItem renders with data-testid="ephemeral-message"
    expect(screen.getByTestId("ephemeral-message")).toBeTruthy();
    expect(screen.queryByText(/No messages yet/)).toBeNull();
  });

  // ── Pagination indicators ──────────────────────────────────────

  test("shows loading-older indicator when loadingOlder=true", () => {
    olderConfig.loadingOlder = true;
    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("loading-older")).toBeTruthy();
  });

  test("shows loading-newer indicator when loadingNewer=true", () => {
    newerConfig.loadingNewer = true;
    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("loading-newer")).toBeTruthy();
  });

  test("does not show loading-older when loadingOlder=false", () => {
    render(<MessageList channelId="ch-1" />);
    expect(screen.queryByTestId("loading-older")).toBeNull();
  });

  // ── Day separators ─────────────────────────────────────────────

  test("renders DaySeparator between messages on different days", () => {
    mockState.messagesById = {
      m1: makeMessage("m1", "Day one", { createdAt: "2026-02-26T10:00:00Z" }),
      m2: makeMessage("m2", "Day two", { createdAt: "2026-02-27T10:00:00Z" }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2"];

    render(<MessageList channelId="ch-1" />);
    const separators = screen.getAllByTestId("day-separator");
    // One separator before m1 (first message always gets one) and one before m2 (different day)
    expect(separators.length).toBe(2);
  });

  test("does not insert extra separator between messages on same day", () => {
    mockState.messagesById = {
      m1: makeMessage("m1", "Morning", { createdAt: "2026-02-27T08:00:00Z" }),
      m2: makeMessage("m2", "Afternoon", { createdAt: "2026-02-27T14:00:00Z" }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2"];

    render(<MessageList channelId="ch-1" />);
    const separators = screen.getAllByTestId("day-separator");
    // Only one separator — before the first message
    expect(separators.length).toBe(1);
  });

  // ── Huddle system messages ─────────────────────────────────────

  test("renders HuddleSystemMessage for messages with type=huddle", () => {
    mockState.messagesById = {
      m1: makeMessage("m1", "Regular msg"),
      m2: makeMessage("m2", "Huddle started", { type: "huddle" as any }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2"];

    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("msg-m1")).toBeTruthy();
    // Real HuddleSystemMessage renders with data-testid="huddle-system-message"
    expect(screen.getByTestId("huddle-system-message")).toBeTruthy();
    // huddle message should NOT render as MessageItem
    expect(screen.queryByTestId("msg-m2")).toBeNull();
  });

  // ── Status emoji ───────────────────────────────────────────────

  test("passes senderStatusEmoji to MessageItem when presence has non-expired status", () => {
    const futureDate = new Date(Date.now() + 3600_000).toISOString();
    mockState.presence = {
      "user-1": { statusEmoji: "\u{1F389}", statusExpiresAt: futureDate },
    };

    render(<MessageList channelId="ch-1" />);
    const msgEl = screen.getByTestId("msg-m1");
    expect(msgEl.getAttribute("data-status-emoji")).toBe("\u{1F389}");
  });

  test("passes empty string when status is expired", () => {
    const pastDate = new Date(Date.now() - 3600_000).toISOString();
    mockState.presence = {
      "user-1": { statusEmoji: "\u{1F389}", statusExpiresAt: pastDate },
    };

    render(<MessageList channelId="ch-1" />);
    const msgEl = screen.getByTestId("msg-m1");
    expect(msgEl.getAttribute("data-status-emoji")).toBe("");
  });

  test("passes empty string when no status emoji in presence", () => {
    mockState.presence = {
      "user-1": {},
    };

    render(<MessageList channelId="ch-1" />);
    const msgEl = screen.getByTestId("msg-m1");
    expect(msgEl.getAttribute("data-status-emoji")).toBe("");
  });

  // ── Message grouping ─────────────────────────────────────────

  test("groups consecutive same-user messages within 5 minutes", () => {
    mockState.messagesById = {
      m1: makeMessage("m1", "First", { userId: "user-1" as UserId, createdAt: "2026-02-27T10:00:00Z" }),
      m2: makeMessage("m2", "Second", { userId: "user-1" as UserId, createdAt: "2026-02-27T10:02:00Z" }),
      m3: makeMessage("m3", "Third", { userId: "user-1" as UserId, createdAt: "2026-02-27T10:04:00Z" }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2", "m3"];

    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("msg-m1").getAttribute("data-grouped")).toBe("false");
    expect(screen.getByTestId("msg-m2").getAttribute("data-grouped")).toBe("true");
    expect(screen.getByTestId("msg-m3").getAttribute("data-grouped")).toBe("true");
  });

  test("does not group messages from different users", () => {
    mockState.messagesById = {
      m1: makeMessage("m1", "Hello", { userId: "user-1" as UserId, createdAt: "2026-02-27T10:00:00Z" }),
      m2: makeMessage("m2", "Hi", { userId: "user-2" as UserId, createdAt: "2026-02-27T10:01:00Z" }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2"];

    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("msg-m1").getAttribute("data-grouped")).toBe("false");
    expect(screen.getByTestId("msg-m2").getAttribute("data-grouped")).toBe("false");
  });

  test("does not group messages more than 5 minutes apart", () => {
    mockState.messagesById = {
      m1: makeMessage("m1", "First", { userId: "user-1" as UserId, createdAt: "2026-02-27T10:00:00Z" }),
      m2: makeMessage("m2", "Second", { userId: "user-1" as UserId, createdAt: "2026-02-27T10:06:00Z" }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2"];

    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("msg-m1").getAttribute("data-grouped")).toBe("false");
    expect(screen.getByTestId("msg-m2").getAttribute("data-grouped")).toBe("false");
  });

  // ── Auto-scroll on own message ─────────────────────────────────

  test("auto-scrolls to bottom when newest message is from current user even if not near bottom", () => {
    const { rerender } = render(<MessageList channelId="ch-1" />);
    const container = screen.getByTestId("message-list-scroll");

    // Simulate scrolled up (not near bottom)
    Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 200, writable: true, configurable: true });
    container.dispatchEvent(new Event("scroll"));

    // Add a new message from current user (user-1)
    mockState.channelMessageIds["ch-1"] = ["m1", "m2", "m3", "m4"];
    mockState.messagesById.m4 = makeMessage("m4", "My new message", { userId: "user-1" as UserId });

    rerender(<MessageList channelId="ch-1" />);

    // Should scroll to bottom because the newest message is from the current user
    expect(container.scrollTop).toBe(2000);
  });

  test("does not auto-scroll when newest message is from another user and not near bottom", () => {
    const { rerender } = render(<MessageList channelId="ch-1" />);
    const container = screen.getByTestId("message-list-scroll");

    // Simulate scrolled up (not near bottom)
    Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 200, writable: true, configurable: true });
    container.dispatchEvent(new Event("scroll"));

    // Add a new message from another user
    mockState.channelMessageIds["ch-1"] = ["m1", "m2", "m3", "m4"];
    mockState.messagesById.m4 = makeMessage("m4", "Their message", { userId: "user-2" as UserId });

    rerender(<MessageList channelId="ch-1" />);

    // Should NOT scroll — not near bottom and not from current user
    expect(container.scrollTop).toBe(200);
  });

  // ── Scroll position caching ─────────────────────────────────────

  test("restores scroll position when switching back to a previously viewed channel", () => {
    // Start on ch-1
    const { rerender } = render(<MessageList channelId="ch-1" />);
    const container = screen.getByTestId("message-list-scroll");

    // Simulate a scroll position on ch-1
    Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 300, writable: true, configurable: true });
    container.dispatchEvent(new Event("scroll"));

    // Set up ch-2 data
    mockState.channelMessageIds["ch-2"] = ["m5"];
    mockState.messagesById.m5 = makeMessage("m5", "Channel 2 msg", { channelId: "ch-2" as ChannelId });

    // Switch to ch-2
    rerender(<MessageList channelId="ch-2" />);

    // Switch back to ch-1
    rerender(<MessageList channelId="ch-1" />);

    // Should restore the cached scroll position of 300
    expect(container.scrollTop).toBe(300);
  });

  test("scrolls to bottom on first visit to a channel (no cached position)", () => {
    render(<MessageList channelId="ch-1" />);
    const container = screen.getByTestId("message-list-scroll");

    // On initial render with no cached position, should scroll to scrollHeight
    // (scrollHeight is 0 in jsdom, so scrollTop should be set to scrollHeight)
    expect(container.scrollTop).toBe(container.scrollHeight);
  });

  test("day separator breaks grouping even for same user within 5 minutes", () => {
    // Messages across midnight boundary — same user, technically close in time
    mockState.messagesById = {
      m1: makeMessage("m1", "Late night", { userId: "user-1" as UserId, createdAt: "2026-02-26T23:59:00Z" }),
      m2: makeMessage("m2", "Early morning", { userId: "user-1" as UserId, createdAt: "2026-02-27T00:01:00Z" }),
    };
    mockState.channelMessageIds["ch-1"] = ["m1", "m2"];

    render(<MessageList channelId="ch-1" />);
    expect(screen.getByTestId("msg-m1").getAttribute("data-grouped")).toBe("false");
    expect(screen.getByTestId("msg-m2").getAttribute("data-grouped")).toBe("false");
    // Should have 2 day separators (one per day)
    expect(screen.getAllByTestId("day-separator").length).toBe(2);
  });

  // ── Socket event handlers ──────────────────────────────────────

  test("message:new with matching channelId dispatches messages/upsert", () => {
    render(<MessageList channelId="ch-1" />);

    const newMsg = makeMessage("m-new", "New message", { channelId: "ch-1" as ChannelId });
    socketHandlers["message:new"]?.(newMsg);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "messages/upsert", message: newMsg });
  });

  test("message:new with different channelId does NOT dispatch", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    const newMsg = makeMessage("m-new", "Other channel", { channelId: "ch-other" as ChannelId });
    socketHandlers["message:new"]?.(newMsg);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test("message:new with parentMessageId set does NOT dispatch (thread reply filtered)", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    const threadReply = makeMessage("m-new", "Thread reply", {
      channelId: "ch-1" as ChannelId,
      parentMessageId: "m1" as MessageId,
    });
    socketHandlers["message:new"]?.(threadReply);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test("thread:updated with matching channelId dispatches messages/updateThreadSummary", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    socketHandlers["thread:updated"]?.({
      parentMessageId: "m1" as MessageId,
      channelId: "ch-1" as ChannelId,
      replyCount: 5,
      latestReplyAt: "2026-03-01T10:00:00Z",
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "messages/updateThreadSummary",
      channelId: "ch-1",
      parentMessageId: "m1",
      replyCount: 5,
      latestReplyAt: "2026-03-01T10:00:00Z",
    });
  });

  test("reaction:updated with matching channelId dispatches messages/updateReactions", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    const reactions: ReactionGroup[] = [{ emoji: "👍", count: 2, userIds: ["user-1" as UserId, "user-2" as UserId] }];
    socketHandlers["reaction:updated"]?.({
      messageId: "m1" as MessageId,
      channelId: "ch-1" as ChannelId,
      reactions,
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "messages/updateReactions",
      messageId: "m1",
      reactions,
    });
  });

  test("message:updated with matching channelId dispatches messages/upsert", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    const updated = makeMessage("m1", "Edited content", { channelId: "ch-1" as ChannelId });
    socketHandlers["message:updated"]?.(updated);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "messages/upsert", message: updated });
  });

  test("message:deleted with matching channelId dispatches messages/delete", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    socketHandlers["message:deleted"]?.({
      id: "m2" as MessageId,
      channelId: "ch-1" as ChannelId,
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "messages/delete",
      messageId: "m2",
      channelId: "ch-1",
    });
  });

  test("message:pinned with matching channelId dispatches messages/updatePinStatus isPinned=true", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    socketHandlers["message:pinned"]?.({
      messageId: "m1" as MessageId,
      channelId: "ch-1" as ChannelId,
      pinnedBy: "user-2" as UserId,
      pinnedAt: "2026-03-01T10:00:00Z",
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "messages/updatePinStatus",
      messageId: "m1",
      isPinned: true,
      pinnedBy: "user-2",
      pinnedAt: "2026-03-01T10:00:00Z",
    });
  });

  test("message:unpinned with matching channelId dispatches messages/updatePinStatus isPinned=false", () => {
    render(<MessageList channelId="ch-1" />);
    mockDispatch.mockClear();

    socketHandlers["message:unpinned"]?.({
      messageId: "m1" as MessageId,
      channelId: "ch-1" as ChannelId,
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "messages/updatePinStatus",
      messageId: "m1",
      isPinned: false,
    });
  });

  test("command:ephemeral with matching channelId calls onEphemeralMessage", () => {
    const onEphemeralMessage = jest.fn();
    render(<MessageList channelId="ch-1" onEphemeralMessage={onEphemeralMessage} />);

    const ephemeral = {
      id: "eph-1",
      channelId: "ch-1",
      text: "ephemeral text",
      createdAt: new Date().toISOString(),
    };
    socketHandlers["command:ephemeral"]?.(ephemeral);

    expect(onEphemeralMessage).toHaveBeenCalledWith(ephemeral);
  });

  test("command:ephemeral with different channelId does NOT call onEphemeralMessage", () => {
    const onEphemeralMessage = jest.fn();
    render(<MessageList channelId="ch-1" onEphemeralMessage={onEphemeralMessage} />);

    socketHandlers["command:ephemeral"]?.({
      id: "eph-1",
      channelId: "ch-other",
      text: "other channel",
      createdAt: new Date().toISOString(),
    });

    expect(onEphemeralMessage).not.toHaveBeenCalled();
  });
});
