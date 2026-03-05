import { describe, expect, it } from "bun:test";
import type { Channel, Message, HuddleState } from "@openslaq/shared";
import { asChannelId, asMessageId, asUserId, asWorkspaceId } from "@openslaq/shared";
import { chatReducer, initialState, type ChatStoreState, type DmConversation, type WorkspaceInfo } from "./chat-reducer";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let _msgCounter = 0;
function makeMessage(overrides: Partial<Message> = {}): Message {
  const n = ++_msgCounter;
  return {
    id: asMessageId(`msg-${n}`),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    content: `message ${n}`,
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt: new Date(2024, 0, 1, 0, 0, n).toISOString(),
    updatedAt: new Date(2024, 0, 1, 0, 0, n).toISOString(),
    ...overrides,
  } as Message;
}

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: asChannelId("ch-1"),
    workspaceId: asWorkspaceId("ws-1"),
    name: "general",
    type: "public",
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: asUserId("user-1"),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDm(channelId = "dm-1"): DmConversation {
  return {
    channel: makeChannel({ id: asChannelId(channelId), type: "dm", name: "dm" }),
    otherUser: { id: "user-2", displayName: "Bob", avatarUrl: null },
  };
}

function makeWorkspaceInfo(overrides: Partial<WorkspaceInfo> = {}): WorkspaceInfo {
  return {
    id: asWorkspaceId("ws-1"),
    name: "Test",
    slug: "test",
    createdAt: new Date().toISOString(),
    role: "member",
    ...overrides,
  };
}

function makeHuddle(channelId: string): HuddleState {
  return {
    channelId: asChannelId(channelId),
    participants: [],
    startedAt: new Date().toISOString(),
    livekitRoom: `huddle-${channelId}`,
    screenShareUserId: null,
    messageId: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("bootstrap", () => {
  it("bootstrapStart sets loading and clears error", () => {
    const state = chatReducer(initialState, {
      type: "workspace/bootstrapStart",
      workspaceSlug: "test",
    });
    expect(state.ui.bootstrapLoading).toBe(true);
    expect(state.ui.bootstrapError).toBeNull();
    expect(state.workspaceSlug).toBe("test");
  });

  it("bootstrapStart preserves state for same workspace", () => {
    const prev: ChatStoreState = {
      ...initialState,
      workspaceSlug: "test",
      channels: [makeChannel()],
      activeChannelId: "ch-1",
    };
    const state = chatReducer(prev, {
      type: "workspace/bootstrapStart",
      workspaceSlug: "test",
    });
    expect(state.channels).toHaveLength(1);
    expect(state.activeChannelId).toBe("ch-1");
  });

  it("bootstrapStart resets state for different workspace", () => {
    const prev: ChatStoreState = {
      ...initialState,
      workspaceSlug: "old",
      channels: [makeChannel()],
      activeChannelId: "ch-1",
      dms: [makeDm()],
    };
    const state = chatReducer(prev, {
      type: "workspace/bootstrapStart",
      workspaceSlug: "new",
    });
    expect(state.channels).toHaveLength(0);
    expect(state.dms).toHaveLength(0);
    expect(state.activeChannelId).toBeNull();
  });

  it("bootstrapSuccess sets channels/workspaces/dms and clears loading", () => {
    const prev: ChatStoreState = {
      ...initialState,
      ui: { ...initialState.ui, bootstrapLoading: true },
    };
    const channels = [makeChannel()];
    const workspaces = [makeWorkspaceInfo()];
    const dms = [makeDm()];
    const state = chatReducer(prev, {
      type: "workspace/bootstrapSuccess",
      channels,
      workspaces,
      dms,
      groupDms: [],
    });
    expect(state.channels).toBe(channels);
    expect(state.workspaces).toBe(workspaces);
    expect(state.dms).toBe(dms);
    expect(state.ui.bootstrapLoading).toBe(false);
  });

  it("bootstrapError sets error and clears loading", () => {
    const prev: ChatStoreState = {
      ...initialState,
      ui: { ...initialState.ui, bootstrapLoading: true },
    };
    const state = chatReducer(prev, {
      type: "workspace/bootstrapError",
      error: "Network error",
    });
    expect(state.ui.bootstrapLoading).toBe(false);
    expect(state.ui.bootstrapError).toBe("Network error");
  });
});

describe("navigation", () => {
  it("selectChannel sets active channel and clears others", () => {
    const prev: ChatStoreState = {
      ...initialState,
      activeDmId: "dm-1",
      activeThreadId: "thread-1",
      activeProfileUserId: "user-1",
      unreadCounts: { "ch-1": 5, "ch-2": 3 },
    };
    const state = chatReducer(prev, {
      type: "workspace/selectChannel",
      channelId: "ch-1",
    });
    expect(state.activeChannelId).toBe("ch-1");
    expect(state.activeDmId).toBeNull();
    expect(state.activeThreadId).toBeNull();
    expect(state.activeProfileUserId).toBeNull();
    expect(state.unreadCounts["ch-1"]).toBeUndefined();
    expect(state.unreadCounts["ch-2"]).toBe(3);
  });

  it("selectDm sets active DM and clears others", () => {
    const prev: ChatStoreState = {
      ...initialState,
      activeChannelId: "ch-1",
      unreadCounts: { "dm-1": 2 },
    };
    const state = chatReducer(prev, {
      type: "workspace/selectDm",
      channelId: "dm-1",
    });
    expect(state.activeDmId).toBe("dm-1");
    expect(state.activeChannelId).toBeNull();
    expect(state.unreadCounts["dm-1"]).toBeUndefined();
  });

  it("openThread sets thread and clears profile", () => {
    const prev: ChatStoreState = {
      ...initialState,
      activeProfileUserId: "user-1",
    };
    const state = chatReducer(prev, {
      type: "workspace/openThread",
      messageId: "msg-1",
    });
    expect(state.activeThreadId).toBe("msg-1");
    expect(state.activeProfileUserId).toBeNull();
  });

  it("closeThread clears thread", () => {
    const prev: ChatStoreState = { ...initialState, activeThreadId: "msg-1" };
    const state = chatReducer(prev, { type: "workspace/closeThread" });
    expect(state.activeThreadId).toBeNull();
  });

  it("openProfile sets profile and clears thread", () => {
    const prev: ChatStoreState = { ...initialState, activeThreadId: "msg-1" };
    const state = chatReducer(prev, {
      type: "workspace/openProfile",
      userId: "user-1",
    });
    expect(state.activeProfileUserId).toBe("user-1");
    expect(state.activeThreadId).toBeNull();
  });

  it("closeProfile clears profile", () => {
    const prev: ChatStoreState = { ...initialState, activeProfileUserId: "user-1" };
    const state = chatReducer(prev, { type: "workspace/closeProfile" });
    expect(state.activeProfileUserId).toBeNull();
  });
});

describe("channels & DMs", () => {
  it("addDm appends a new DM", () => {
    const dm = makeDm("dm-1");
    const state = chatReducer(initialState, { type: "workspace/addDm", dm });
    expect(state.dms).toHaveLength(1);
    expect(state.dms[0]).toBe(dm);
  });

  it("addDm deduplicates by channel id", () => {
    const dm = makeDm("dm-1");
    const prev: ChatStoreState = { ...initialState, dms: [dm] };
    const state = chatReducer(prev, { type: "workspace/addDm", dm });
    expect(state.dms).toHaveLength(1);
    expect(state).toBe(prev); // reference equality — no change
  });

  it("addChannel appends a new channel", () => {
    const ch = makeChannel({ id: asChannelId("ch-new") });
    const state = chatReducer(initialState, {
      type: "workspace/addChannel",
      channel: ch,
    });
    expect(state.channels).toHaveLength(1);
  });

  it("addChannel deduplicates", () => {
    const ch = makeChannel({ id: asChannelId("ch-1") });
    const prev: ChatStoreState = { ...initialState, channels: [ch] };
    const state = chatReducer(prev, {
      type: "workspace/addChannel",
      channel: ch,
    });
    expect(state).toBe(prev);
  });

  it("removeChannel filters channel and resets activeChannelId if matching", () => {
    const ch = makeChannel({ id: asChannelId("ch-1") });
    const prev: ChatStoreState = {
      ...initialState,
      channels: [ch],
      activeChannelId: "ch-1",
    };
    const state = chatReducer(prev, {
      type: "workspace/removeChannel",
      channelId: "ch-1",
    });
    expect(state.channels).toHaveLength(0);
    expect(state.activeChannelId).toBeNull();
  });

  it("removeChannel keeps activeChannelId if not matching", () => {
    const prev: ChatStoreState = {
      ...initialState,
      channels: [makeChannel({ id: asChannelId("ch-1") }), makeChannel({ id: asChannelId("ch-2") })],
      activeChannelId: "ch-2",
    };
    const state = chatReducer(prev, {
      type: "workspace/removeChannel",
      channelId: "ch-1",
    });
    expect(state.channels).toHaveLength(1);
    expect(state.activeChannelId).toBe("ch-2");
  });
});

describe("channel messages", () => {
  it("loadStart sets loading true and clears error", () => {
    const state = chatReducer(initialState, {
      type: "channel/loadStart",
      channelId: "ch-1",
    });
    expect(state.ui.channelMessagesLoading["ch-1"]).toBe(true);
    expect(state.ui.channelMessagesError["ch-1"]).toBeNull();
  });

  it("loadError sets error and clears loading", () => {
    const state = chatReducer(initialState, {
      type: "channel/loadError",
      channelId: "ch-1",
      error: "fail",
    });
    expect(state.ui.channelMessagesLoading["ch-1"]).toBe(false);
    expect(state.ui.channelMessagesError["ch-1"]).toBe("fail");
  });

  it("setMessages stores messages and sets pagination", () => {
    const m1 = makeMessage({ channelId: asChannelId("ch-1") });
    const m2 = makeMessage({ channelId: asChannelId("ch-1") });
    const state = chatReducer(initialState, {
      type: "channel/setMessages",
      channelId: "ch-1",
      messages: [m1, m2],
      olderCursor: "cur-old",
      newerCursor: "cur-new",
      hasOlder: true,
      hasNewer: false,
    });
    expect(state.channelMessageIds["ch-1"]).toEqual([m1.id, m2.id]);
    expect(state.messagesById[m1.id]).toBe(m1);
    expect(state.channelPagination["ch-1"]!.olderCursor).toBe("cur-old");
    expect(state.channelPagination["ch-1"]!.hasOlder).toBe(true);
    expect(state.ui.channelMessagesLoading["ch-1"]).toBe(false);
  });

  it("prependMessages adds to the front and dedupes", () => {
    const existing = makeMessage({ id: asMessageId("e1"), channelId: asChannelId("ch-1") });
    const newMsg = makeMessage({ id: asMessageId("n1"), channelId: asChannelId("ch-1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { [existing.id]: existing },
      channelMessageIds: { "ch-1": [existing.id] },
      channelPagination: {
        "ch-1": {
          olderCursor: "old",
          newerCursor: "new",
          hasOlder: true,
          hasNewer: true,
          loadingOlder: true,
          loadingNewer: false,
        },
      },
    };
    const state = chatReducer(prev, {
      type: "channel/prependMessages",
      channelId: "ch-1",
      messages: [newMsg],
      olderCursor: "cur-older",
      hasOlder: false,
    });
    expect(state.channelMessageIds["ch-1"]).toEqual([newMsg.id, existing.id]);
    expect(state.channelPagination["ch-1"]!.olderCursor).toBe("cur-older");
    expect(state.channelPagination["ch-1"]!.hasOlder).toBe(false);
    // Preserves newerCursor from previous state
    expect(state.channelPagination["ch-1"]!.newerCursor).toBe("new");
    expect(state.channelPagination["ch-1"]!.loadingOlder).toBe(false);
  });

  it("appendMessages adds to the end and dedupes", () => {
    const existing = makeMessage({ id: asMessageId("e1"), channelId: asChannelId("ch-1") });
    const newMsg = makeMessage({ id: asMessageId("n1"), channelId: asChannelId("ch-1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { [existing.id]: existing },
      channelMessageIds: { "ch-1": [existing.id] },
      channelPagination: {
        "ch-1": {
          olderCursor: "old",
          newerCursor: "new",
          hasOlder: true,
          hasNewer: true,
          loadingOlder: false,
          loadingNewer: true,
        },
      },
    };
    const state = chatReducer(prev, {
      type: "channel/appendMessages",
      channelId: "ch-1",
      messages: [newMsg],
      newerCursor: "cur-newer",
      hasNewer: false,
    });
    expect(state.channelMessageIds["ch-1"]).toEqual([existing.id, newMsg.id]);
    expect(state.channelPagination["ch-1"]!.newerCursor).toBe("cur-newer");
    expect(state.channelPagination["ch-1"]!.hasNewer).toBe(false);
    // Preserves olderCursor from previous state
    expect(state.channelPagination["ch-1"]!.olderCursor).toBe("old");
    expect(state.channelPagination["ch-1"]!.loadingNewer).toBe(false);
  });

  it("setLoadingOlder updates loading flag", () => {
    const prev: ChatStoreState = {
      ...initialState,
      channelPagination: {
        "ch-1": { olderCursor: null, newerCursor: null, hasOlder: false, hasNewer: false, loadingOlder: false, loadingNewer: false },
      },
    };
    const state = chatReducer(prev, {
      type: "channel/setLoadingOlder",
      channelId: "ch-1",
      loading: true,
    });
    expect(state.channelPagination["ch-1"]!.loadingOlder).toBe(true);
  });

  it("setLoadingOlder returns state if no pagination exists", () => {
    const state = chatReducer(initialState, {
      type: "channel/setLoadingOlder",
      channelId: "ch-1",
      loading: true,
    });
    expect(state).toBe(initialState);
  });

  it("setLoadingNewer updates loading flag", () => {
    const prev: ChatStoreState = {
      ...initialState,
      channelPagination: {
        "ch-1": { olderCursor: null, newerCursor: null, hasOlder: false, hasNewer: false, loadingOlder: false, loadingNewer: false },
      },
    };
    const state = chatReducer(prev, {
      type: "channel/setLoadingNewer",
      channelId: "ch-1",
      loading: true,
    });
    expect(state.channelPagination["ch-1"]!.loadingNewer).toBe(true);
  });

  it("setLoadingNewer returns state if no pagination exists", () => {
    const state = chatReducer(initialState, {
      type: "channel/setLoadingNewer",
      channelId: "ch-1",
      loading: true,
    });
    expect(state).toBe(initialState);
  });
});

describe("threads", () => {
  it("loadStart sets loading true", () => {
    const state = chatReducer(initialState, {
      type: "thread/loadStart",
      parentMessageId: "msg-1",
    });
    expect(state.ui.threadLoading["msg-1"]).toBe(true);
    expect(state.ui.threadError["msg-1"]).toBeNull();
  });

  it("loadError sets error and clears loading", () => {
    const state = chatReducer(initialState, {
      type: "thread/loadError",
      parentMessageId: "msg-1",
      error: "fail",
    });
    expect(state.ui.threadLoading["msg-1"]).toBe(false);
    expect(state.ui.threadError["msg-1"]).toBe("fail");
  });

  it("setData stores parent and replies", () => {
    const parent = makeMessage({ id: asMessageId("p1") });
    const reply = makeMessage({ id: asMessageId("r1"), parentMessageId: asMessageId("p1") });
    const state = chatReducer(initialState, {
      type: "thread/setData",
      parent,
      replies: [reply],
      newerCursor: "tc",
      hasNewer: true,
    });
    expect(state.messagesById["p1"]).toBe(parent);
    expect(state.messagesById["r1"]).toBe(reply);
    expect(state.threadReplyIds["p1"]).toEqual(["r1"]);
    expect(state.threadPagination["p1"]!.newerCursor).toBe("tc");
    expect(state.threadPagination["p1"]!.hasNewer).toBe(true);
    expect(state.ui.threadLoading["p1"]).toBe(false);
  });

  it("appendReplies adds replies to existing thread", () => {
    const r1 = makeMessage({ id: asMessageId("r1"), parentMessageId: asMessageId("p1") });
    const r2 = makeMessage({ id: asMessageId("r2"), parentMessageId: asMessageId("p1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { r1 },
      threadReplyIds: { p1: ["r1"] },
    };
    const state = chatReducer(prev, {
      type: "thread/appendReplies",
      parentMessageId: "p1",
      replies: [r2],
      newerCursor: "nc",
      hasNewer: false,
    });
    expect(state.threadReplyIds["p1"]).toEqual(["r1", "r2"]);
    expect(state.threadPagination["p1"]!.hasNewer).toBe(false);
  });

  it("setLoadingNewer updates thread loading flag", () => {
    const prev: ChatStoreState = {
      ...initialState,
      threadPagination: { p1: { olderCursor: null, hasOlder: false, loadingOlder: false, newerCursor: null, hasNewer: false, loadingNewer: false } },
    };
    const state = chatReducer(prev, {
      type: "thread/setLoadingNewer",
      parentMessageId: "p1",
      loading: true,
    });
    expect(state.threadPagination["p1"]!.loadingNewer).toBe(true);
  });

  it("setLoadingNewer returns state if no pagination exists", () => {
    const state = chatReducer(initialState, {
      type: "thread/setLoadingNewer",
      parentMessageId: "p1",
      loading: true,
    });
    expect(state).toBe(initialState);
  });
});

describe("message mutations", () => {
  it("upsert inserts a new channel message sorted by createdAt", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), channelId: asChannelId("ch-1"), createdAt: "2024-01-01T00:00:01Z" });
    const m3 = makeMessage({ id: asMessageId("m3"), channelId: asChannelId("ch-1"), createdAt: "2024-01-01T00:00:03Z" });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1, m3 },
      channelMessageIds: { "ch-1": ["m1", "m3"] },
    };
    const m2 = makeMessage({ id: asMessageId("m2"), channelId: asChannelId("ch-1"), createdAt: "2024-01-01T00:00:02Z" });
    const state = chatReducer(prev, { type: "messages/upsert", message: m2 });
    expect(state.channelMessageIds["ch-1"]).toEqual(["m1", "m2", "m3"]);
    expect(state.messagesById["m2"]).toBe(m2);
  });

  it("upsert updates existing message in place", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), content: "old" });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1 },
      channelMessageIds: { "ch-1": ["m1"] },
    };
    const updated = { ...m1, content: "new" };
    const state = chatReducer(prev, { type: "messages/upsert", message: updated });
    expect(state.messagesById["m1"]!.content).toBe("new");
    // Deduped — still only one entry
    expect(state.channelMessageIds["ch-1"]).toEqual(["m1"]);
  });

  it("upsert inserts into thread replies when parentMessageId is set", () => {
    const parent = makeMessage({ id: asMessageId("p1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { p1: parent },
      threadReplyIds: { p1: [] },
    };
    const reply = makeMessage({ id: asMessageId("r1"), parentMessageId: asMessageId("p1") });
    const state = chatReducer(prev, { type: "messages/upsert", message: reply });
    expect(state.threadReplyIds["p1"]).toEqual(["r1"]);
    // Should NOT be in channel messages
    expect(state.channelMessageIds[reply.channelId]).toBeUndefined();
  });

  it("delete removes message from channel and all thread reply lists", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), channelId: asChannelId("ch-1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1 },
      channelMessageIds: { "ch-1": ["m1"] },
      threadReplyIds: { p1: ["m1", "other"] },
    };
    const state = chatReducer(prev, {
      type: "messages/delete",
      messageId: "m1",
      channelId: "ch-1",
    });
    expect(state.messagesById["m1"]).toBeUndefined();
    expect(state.channelMessageIds["ch-1"]).toEqual([]);
    expect(state.threadReplyIds["p1"]).toEqual(["other"]);
  });

  it("delete parent message drops its thread replies", () => {
    const parent = makeMessage({ id: asMessageId("p1"), channelId: asChannelId("ch-1"), parentMessageId: null });
    const reply = makeMessage({ id: asMessageId("r1"), parentMessageId: asMessageId("p1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { p1: parent, r1: reply },
      channelMessageIds: { "ch-1": ["p1"] },
      threadReplyIds: { p1: ["r1"] },
    };
    const state = chatReducer(prev, {
      type: "messages/delete",
      messageId: "p1",
      channelId: "ch-1",
    });
    expect(state.threadReplyIds["p1"]).toBeUndefined();
  });

  it("delete clears activeThreadId if it matches", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), channelId: asChannelId("ch-1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1 },
      channelMessageIds: { "ch-1": ["m1"] },
      activeThreadId: "m1",
    };
    const state = chatReducer(prev, {
      type: "messages/delete",
      messageId: "m1",
      channelId: "ch-1",
    });
    expect(state.activeThreadId).toBeNull();
  });

  it("updateReactions updates reactions on existing message", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), reactions: [] });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1 },
    };
    const reactions = [{ emoji: "thumbsup", count: 1, userIds: [asUserId("user-1")] }];
    const state = chatReducer(prev, {
      type: "messages/updateReactions",
      messageId: "m1",
      reactions,
    });
    expect(state.messagesById["m1"]!.reactions).toBe(reactions);
  });

  it("updateReactions returns state unchanged if message missing", () => {
    const state = chatReducer(initialState, {
      type: "messages/updateReactions",
      messageId: "nonexistent",
      reactions: [],
    });
    expect(state).toBe(initialState);
  });

  it("updateThreadSummary updates replyCount and latestReplyAt", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), channelId: asChannelId("ch-1"), replyCount: 0, latestReplyAt: null });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1 },
    };
    const state = chatReducer(prev, {
      type: "messages/updateThreadSummary",
      channelId: asChannelId("ch-1"),
      parentMessageId: asMessageId("m1"),
      replyCount: 5,
      latestReplyAt: "2024-01-01T12:00:00Z",
    });
    expect(state.messagesById["m1"]!.replyCount).toBe(5);
    expect(state.messagesById["m1"]!.latestReplyAt).toBe("2024-01-01T12:00:00Z");
  });

  it("updateThreadSummary returns state if message missing", () => {
    const state = chatReducer(initialState, {
      type: "messages/updateThreadSummary",
      channelId: asChannelId("ch-1"),
      parentMessageId: asMessageId("nonexistent"),
      replyCount: 1,
      latestReplyAt: "2024-01-01T12:00:00Z",
    });
    expect(state).toBe(initialState);
  });

  it("updateThreadSummary returns state if channelId does not match", () => {
    const m1 = makeMessage({ id: asMessageId("m1"), channelId: asChannelId("ch-1") });
    const prev: ChatStoreState = {
      ...initialState,
      messagesById: { m1 },
    };
    const state = chatReducer(prev, {
      type: "messages/updateThreadSummary",
      channelId: asChannelId("ch-wrong"),
      parentMessageId: asMessageId("m1"),
      replyCount: 1,
      latestReplyAt: "2024-01-01T12:00:00Z",
    });
    expect(state).toBe(prev);
  });
});

describe("unread", () => {
  it("setCounts replaces all counts", () => {
    const state = chatReducer(initialState, {
      type: "unread/setCounts",
      counts: { "ch-1": 3, "ch-2": 7 },
    });
    expect(state.unreadCounts).toEqual({ "ch-1": 3, "ch-2": 7 });
  });

  it("increment from zero", () => {
    const state = chatReducer(initialState, {
      type: "unread/increment",
      channelId: "ch-1",
    });
    expect(state.unreadCounts["ch-1"]).toBe(1);
  });

  it("increment from existing count", () => {
    const prev: ChatStoreState = {
      ...initialState,
      unreadCounts: { "ch-1": 2 },
    };
    const state = chatReducer(prev, {
      type: "unread/increment",
      channelId: "ch-1",
    });
    expect(state.unreadCounts["ch-1"]).toBe(3);
  });

  it("clear removes the key entirely", () => {
    const prev: ChatStoreState = {
      ...initialState,
      unreadCounts: { "ch-1": 5, "ch-2": 1 },
    };
    const state = chatReducer(prev, {
      type: "unread/clear",
      channelId: "ch-1",
    });
    expect(state.unreadCounts["ch-1"]).toBeUndefined();
    expect(state.unreadCounts["ch-2"]).toBe(1);
  });
});

describe("presence", () => {
  it("sync replaces all presence data", () => {
    const prev: ChatStoreState = {
      ...initialState,
      presence: { "user-old": { online: true, lastSeenAt: null } },
    };
    const state = chatReducer(prev, {
      type: "presence/sync",
      users: [
        { userId: "user-1", online: true, lastSeenAt: null },
        { userId: "user-2", online: false, lastSeenAt: "2024-01-01T00:00:00Z" },
      ],
    });
    expect(Object.keys(state.presence)).toEqual(["user-1", "user-2"]);
    expect(state.presence["user-1"]!.online).toBe(true);
    expect(state.presence["user-2"]!.online).toBe(false);
  });

  it("updated merges a single user", () => {
    const prev: ChatStoreState = {
      ...initialState,
      presence: { "user-1": { online: true, lastSeenAt: null } },
    };
    const state = chatReducer(prev, {
      type: "presence/updated",
      userId: "user-2",
      online: true,
      lastSeenAt: null,
    });
    expect(state.presence["user-1"]).toBeDefined();
    expect(state.presence["user-2"]!.online).toBe(true);
  });
});

describe("huddles", () => {
  it("sync replaces all huddles", () => {
    const h1 = makeHuddle("ch-1");
    const state = chatReducer(initialState, {
      type: "huddle/sync",
      huddles: [h1],
    });
    expect(state.activeHuddles["ch-1"]).toBe(h1);
  });

  it("started adds a huddle", () => {
    const h = makeHuddle("ch-1");
    const state = chatReducer(initialState, {
      type: "huddle/started",
      huddle: h,
    });
    expect(state.activeHuddles["ch-1"]).toBe(h);
  });

  it("updated replaces a huddle", () => {
    const h1 = makeHuddle("ch-1");
    const h2 = makeHuddle("ch-1");
    const prev: ChatStoreState = {
      ...initialState,
      activeHuddles: { "ch-1": h1 },
    };
    const state = chatReducer(prev, {
      type: "huddle/updated",
      huddle: h2,
    });
    expect(state.activeHuddles["ch-1"]).toBe(h2);
  });

  it("ended removes huddle and clears currentHuddleChannelId if matching", () => {
    const prev: ChatStoreState = {
      ...initialState,
      activeHuddles: { "ch-1": makeHuddle("ch-1"), "ch-2": makeHuddle("ch-2") },
      currentHuddleChannelId: "ch-1",
    };
    const state = chatReducer(prev, {
      type: "huddle/ended",
      channelId: "ch-1",
    });
    expect(state.activeHuddles["ch-1"]).toBeUndefined();
    expect(state.activeHuddles["ch-2"]).toBeDefined();
    expect(state.currentHuddleChannelId).toBeNull();
  });

  it("ended preserves currentHuddleChannelId if not matching", () => {
    const prev: ChatStoreState = {
      ...initialState,
      activeHuddles: { "ch-1": makeHuddle("ch-1") },
      currentHuddleChannelId: "ch-2",
    };
    const state = chatReducer(prev, {
      type: "huddle/ended",
      channelId: "ch-1",
    });
    expect(state.currentHuddleChannelId).toBe("ch-2");
  });

  it("setCurrentChannel sets the current huddle channel", () => {
    const state = chatReducer(initialState, {
      type: "huddle/setCurrentChannel",
      channelId: "ch-1",
    });
    expect(state.currentHuddleChannelId).toBe("ch-1");
  });
});

describe("scroll target", () => {
  it("setScrollTarget sets the target", () => {
    const target = { messageId: "msg-1", highlightMessageId: "msg-1" };
    const state = chatReducer(initialState, {
      type: "navigation/setScrollTarget",
      scrollTarget: target,
    });
    expect(state.scrollTarget).toBe(target);
  });

  it("clearScrollTarget clears the target", () => {
    const prev: ChatStoreState = {
      ...initialState,
      scrollTarget: { messageId: "msg-1", highlightMessageId: "msg-1" },
    };
    const state = chatReducer(prev, { type: "navigation/clearScrollTarget" });
    expect(state.scrollTarget).toBeNull();
  });
});

describe("misc", () => {
  it("demo/hydrate replaces state and clears mutationError", () => {
    const hydrated: ChatStoreState = {
      ...initialState,
      workspaceSlug: "hydrated",
      ui: { ...initialState.ui, mutationError: "should be cleared" },
    };
    const state = chatReducer(initialState, {
      type: "demo/hydrate",
      state: hydrated,
    });
    expect(state.workspaceSlug).toBe("hydrated");
    expect(state.ui.mutationError).toBeNull();
  });

  it("mutations/error sets mutationError", () => {
    const state = chatReducer(initialState, {
      type: "mutations/error",
      error: "Something went wrong",
    });
    expect(state.ui.mutationError).toBe("Something went wrong");
  });

  it("mutations/error can clear mutationError", () => {
    const prev: ChatStoreState = {
      ...initialState,
      ui: { ...initialState.ui, mutationError: "old error" },
    };
    const state = chatReducer(prev, {
      type: "mutations/error",
      error: null,
    });
    expect(state.ui.mutationError).toBeNull();
  });

  it("unknown action returns state unchanged", () => {
    // @ts-expect-error testing unknown action type
    const state = chatReducer(initialState, { type: "unknown/action" });
    expect(state).toBe(initialState);
  });
});
