import {
  channelModalsReducer,
  initialChannelModalsState,
  type ChannelModalsState,
} from "../ChannelModalsContext";
import type { Message, EphemeralMessage } from "@openslaq/shared";
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

function makeEphemeral(overrides: Partial<EphemeralMessage> = {}): EphemeralMessage {
  return {
    id: "eph-1",
    channelId: asChannelId("ch-1"),
    text: "Only visible to you",
    senderName: "Bot",
    senderAvatarUrl: null,
    createdAt: "2025-06-15T12:00:00Z",
    ephemeral: true,
    ...overrides,
  };
}

const reduce = channelModalsReducer;
const initial = initialChannelModalsState;

describe("channelModalsReducer", () => {
  // ---------- editing ----------

  it("setEditingMessage sets the editing message", () => {
    const editing = { id: asMessageId("msg-1"), content: "draft" };
    const state = reduce(initial, { type: "setEditingMessage", message: editing });
    expect(state.editingMessage).toEqual(editing);
  });

  it("setEditingMessage with null clears editing", () => {
    const before: ChannelModalsState = { ...initial, editingMessage: { id: asMessageId("msg-1"), content: "x" } };
    const state = reduce(before, { type: "setEditingMessage", message: null });
    expect(state.editingMessage).toBeNull();
  });

  // ---------- action sheet ----------

  it("showActionSheet sets the message", () => {
    const msg = makeMessage();
    const state = reduce(initial, { type: "showActionSheet", message: msg });
    expect(state.actionSheetMessage).toBe(msg);
  });

  it("closeActionSheet clears the message", () => {
    const before: ChannelModalsState = { ...initial, actionSheetMessage: makeMessage() };
    const state = reduce(before, { type: "closeActionSheet" });
    expect(state.actionSheetMessage).toBeNull();
  });

  // ---------- emoji picker ----------

  it("showEmojiPicker opens picker with message id", () => {
    const state = reduce(initial, { type: "showEmojiPicker", messageId: asMessageId("msg-42") });
    expect(state.showEmojiPicker).toBe(true);
    expect(state.emojiPickerMessageId).toBe(asMessageId("msg-42"));
  });

  it("showEmojiPicker with null messageId opens picker without target", () => {
    const state = reduce(initial, { type: "showEmojiPicker", messageId: null });
    expect(state.showEmojiPicker).toBe(true);
    expect(state.emojiPickerMessageId).toBeNull();
  });

  it("closeEmojiPicker resets picker state", () => {
    const before: ChannelModalsState = { ...initial, showEmojiPicker: true, emojiPickerMessageId: asMessageId("msg-1") };
    const state = reduce(before, { type: "closeEmojiPicker" });
    expect(state.showEmojiPicker).toBe(false);
    expect(state.emojiPickerMessageId).toBeNull();
  });

  // ---------- topic edit ----------

  it("showTopicEdit opens topic editor", () => {
    const state = reduce(initial, { type: "showTopicEdit" });
    expect(state.showTopicEdit).toBe(true);
  });

  it("closeTopicEdit closes topic editor", () => {
    const state = reduce({ ...initial, showTopicEdit: true }, { type: "closeTopicEdit" });
    expect(state.showTopicEdit).toBe(false);
  });

  // ---------- pinned sheet ----------

  it("showPinnedSheet opens the sheet", () => {
    const state = reduce(initial, { type: "showPinnedSheet" });
    expect(state.showPinnedSheet).toBe(true);
  });

  it("closePinnedSheet closes the sheet", () => {
    const state = reduce({ ...initial, showPinnedSheet: true }, { type: "closePinnedSheet" });
    expect(state.showPinnedSheet).toBe(false);
  });

  it("setPinnedMessages replaces the pinned list", () => {
    const msgs = [makeMessage({ id: asMessageId("p1") }), makeMessage({ id: asMessageId("p2") })];
    const state = reduce(initial, { type: "setPinnedMessages", messages: msgs });
    expect(state.pinnedMessages).toHaveLength(2);
    expect(state.pinnedMessages[0]!.id).toBe("p1");
  });

  it("removePinnedMessage removes by id", () => {
    const before: ChannelModalsState = {
      ...initial,
      pinnedMessages: [makeMessage({ id: asMessageId("p1") }), makeMessage({ id: asMessageId("p2") })],
    };
    const state = reduce(before, { type: "removePinnedMessage", messageId: asMessageId("p1") });
    expect(state.pinnedMessages).toHaveLength(1);
    expect(state.pinnedMessages[0]!.id).toBe("p2");
  });

  it("removePinnedMessage is a no-op for unknown id", () => {
    const before: ChannelModalsState = {
      ...initial,
      pinnedMessages: [makeMessage({ id: asMessageId("p1") })],
    };
    const state = reduce(before, { type: "removePinnedMessage", messageId: asMessageId("unknown") });
    expect(state.pinnedMessages).toHaveLength(1);
  });

  it("setPinnedLoading updates loading flag", () => {
    const state = reduce(initial, { type: "setPinnedLoading", loading: true });
    expect(state.pinnedLoading).toBe(true);
    const state2 = reduce(state, { type: "setPinnedLoading", loading: false });
    expect(state2.pinnedLoading).toBe(false);
  });

  // ---------- share message ----------

  it("showShareMessage sets the message", () => {
    const msg = makeMessage({ id: asMessageId("share-1") });
    const state = reduce(initial, { type: "showShareMessage", message: msg });
    expect(state.shareMessage).toBe(msg);
  });

  it("closeShareMessage clears it", () => {
    const before: ChannelModalsState = { ...initial, shareMessage: makeMessage() };
    const state = reduce(before, { type: "closeShareMessage" });
    expect(state.shareMessage).toBeNull();
  });

  // ---------- ephemeral messages ----------

  it("addEphemeralMessages appends to the list", () => {
    const before: ChannelModalsState = {
      ...initial,
      ephemeralMessages: [makeEphemeral({ id: "eph-1" })],
    };
    const state = reduce(before, {
      type: "addEphemeralMessages",
      messages: [makeEphemeral({ id: "eph-2" }), makeEphemeral({ id: "eph-3" })],
    });
    expect(state.ephemeralMessages).toHaveLength(3);
    expect(state.ephemeralMessages.map((m) => m.id)).toEqual(["eph-1", "eph-2", "eph-3"]);
  });

  it("addEphemeralMessages with empty array is a no-op", () => {
    const state = reduce(initial, { type: "addEphemeralMessages", messages: [] });
    expect(state.ephemeralMessages).toEqual([]);
  });

  // ---------- notification sheet ----------

  it("showNotificationSheet opens the sheet", () => {
    const state = reduce(initial, { type: "showNotificationSheet" });
    expect(state.showNotificationSheet).toBe(true);
  });

  it("closeNotificationSheet closes the sheet", () => {
    const state = reduce({ ...initial, showNotificationSheet: true }, { type: "closeNotificationSheet" });
    expect(state.showNotificationSheet).toBe(false);
  });

  // ---------- channel info ----------

  it("showChannelInfo opens the panel", () => {
    const state = reduce(initial, { type: "showChannelInfo" });
    expect(state.showChannelInfo).toBe(true);
  });

  it("closeChannelInfo closes the panel", () => {
    const state = reduce({ ...initial, showChannelInfo: true }, { type: "closeChannelInfo" });
    expect(state.showChannelInfo).toBe(false);
  });

  // ---------- closeAll ----------

  it("closeAll resets everything to initial state", () => {
    const dirty: ChannelModalsState = {
      editingMessage: { id: asMessageId("msg-1"), content: "x" },
      actionSheetMessage: makeMessage(),
      showEmojiPicker: true,
      emojiPickerMessageId: asMessageId("msg-1"),
      showTopicEdit: true,
      showPinnedSheet: true,
      pinnedMessages: [makeMessage()],
      pinnedLoading: true,
      shareMessage: makeMessage(),
      ephemeralMessages: [makeEphemeral()],
      showNotificationSheet: true,
      showChannelInfo: true,
      reactionDetails: null,
    };
    const state = reduce(dirty, { type: "closeAll" });
    expect(state.editingMessage).toBeNull();
    expect(state.actionSheetMessage).toBeNull();
    expect(state.showEmojiPicker).toBe(false);
    expect(state.showTopicEdit).toBe(false);
    expect(state.showPinnedSheet).toBe(false);
    expect(state.pinnedMessages).toEqual([]);
    expect(state.shareMessage).toBeNull();
    expect(state.showNotificationSheet).toBe(false);
    expect(state.showChannelInfo).toBe(false);
  });

  it("closeAll preserves ephemeral messages", () => {
    const ephemerals = [makeEphemeral({ id: "eph-1" }), makeEphemeral({ id: "eph-2" })];
    const dirty: ChannelModalsState = {
      ...initial,
      showEmojiPicker: true,
      ephemeralMessages: ephemerals,
    };
    const state = reduce(dirty, { type: "closeAll" });
    expect(state.ephemeralMessages).toEqual([]);
  });

  it("clearEphemeralMessages clears all ephemeral messages", () => {
    const ephemerals = [makeEphemeral({ id: "eph-1" })];
    const dirty: ChannelModalsState = { ...initial, ephemeralMessages: ephemerals };
    const state = reduce(dirty, { type: "clearEphemeralMessages" });
    expect(state.ephemeralMessages).toEqual([]);
  });
});
