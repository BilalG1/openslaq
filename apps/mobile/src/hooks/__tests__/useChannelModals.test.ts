import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import {
  ChannelModalsProvider,
  useChannelModals,
  channelModalsReducer,
  initialChannelModalsState,
} from "@/contexts/ChannelModalsContext";
import type { ChannelModalsAction } from "@/contexts/ChannelModalsContext";
import type { Message, EphemeralMessage } from "@openslaq/shared";
import { asUserId, asMessageId, asChannelId } from "@openslaq/shared";

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: asMessageId("msg-1"),
  channelId: asChannelId("ch-1"),
  userId: asUserId("user-1"),
  senderDisplayName: "Alice",
  content: "hello",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  parentMessageId: null,
  latestReplyAt: null,
  reactions: [],
  replyCount: 0,
  attachments: [],
  mentions: [],
  ...overrides,
} as Message);

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ChannelModalsProvider, null, children);
}

describe("channelModalsReducer", () => {
  it("handles setEditingMessage", () => {
    const editing = { id: asMessageId("msg-1"), content: "hello" };
    const result = channelModalsReducer(initialChannelModalsState, { type: "setEditingMessage", message: editing });
    expect(result.editingMessage).toEqual(editing);

    const cleared = channelModalsReducer(result, { type: "setEditingMessage", message: null });
    expect(cleared.editingMessage).toBeNull();
  });

  it("handles showActionSheet/closeActionSheet", () => {
    const msg = makeMessage();
    const result = channelModalsReducer(initialChannelModalsState, { type: "showActionSheet", message: msg });
    expect(result.actionSheetMessage).toBe(msg);

    const closed = channelModalsReducer(result, { type: "closeActionSheet" });
    expect(closed.actionSheetMessage).toBeNull();
  });

  it("handles showEmojiPicker/closeEmojiPicker", () => {
    const result = channelModalsReducer(initialChannelModalsState, { type: "showEmojiPicker", messageId: asMessageId("msg-42") });
    expect(result.showEmojiPicker).toBe(true);
    expect(result.emojiPickerMessageId).toBe(asMessageId("msg-42"));

    const closed = channelModalsReducer(result, { type: "closeEmojiPicker" });
    expect(closed.showEmojiPicker).toBe(false);
    expect(closed.emojiPickerMessageId).toBeNull();
  });

  it("handles showTopicEdit/closeTopicEdit", () => {
    const result = channelModalsReducer(initialChannelModalsState, { type: "showTopicEdit" });
    expect(result.showTopicEdit).toBe(true);

    const closed = channelModalsReducer(result, { type: "closeTopicEdit" });
    expect(closed.showTopicEdit).toBe(false);
  });

  it("handles pinned messages state", () => {
    let s = channelModalsReducer(initialChannelModalsState, { type: "showPinnedSheet" });
    expect(s.showPinnedSheet).toBe(true);

    s = channelModalsReducer(s, { type: "setPinnedLoading", loading: true });
    expect(s.pinnedLoading).toBe(true);

    const msgs = [makeMessage({ id: asMessageId("p1") }), makeMessage({ id: asMessageId("p2") })];
    s = channelModalsReducer(s, { type: "setPinnedMessages", messages: msgs });
    expect(s.pinnedMessages).toEqual(msgs);

    s = channelModalsReducer(s, { type: "setPinnedLoading", loading: false });
    expect(s.pinnedLoading).toBe(false);
  });

  it("handles removePinnedMessage", () => {
    const msgs = [makeMessage({ id: asMessageId("p1") }), makeMessage({ id: asMessageId("p2") })];
    let s = channelModalsReducer(initialChannelModalsState, { type: "setPinnedMessages", messages: msgs });
    expect(s.pinnedMessages).toHaveLength(2);

    s = channelModalsReducer(s, { type: "removePinnedMessage", messageId: asMessageId("p1") });
    expect(s.pinnedMessages).toHaveLength(1);
    expect(s.pinnedMessages[0]!.id).toBe("p2");
  });

  it("handles showShareMessage/closeShareMessage", () => {
    const msg = makeMessage();
    const result = channelModalsReducer(initialChannelModalsState, { type: "showShareMessage", message: msg });
    expect(result.shareMessage).toBe(msg);

    const closed = channelModalsReducer(result, { type: "closeShareMessage" });
    expect(closed.shareMessage).toBeNull();
  });

  it("handles addEphemeralMessages", () => {
    const ephemeral: EphemeralMessage = {
      id: "eph-1",
      channelId: asChannelId("ch-1"),
      text: "Only you can see this",
      senderName: "Slaqbot",
      senderAvatarUrl: null,
      createdAt: new Date().toISOString(),
      ephemeral: true,
    };

    const result = channelModalsReducer(initialChannelModalsState, {
      type: "addEphemeralMessages",
      messages: [ephemeral],
    });
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.id).toBe("eph-1");
  });

  it("handles showNotificationSheet/closeNotificationSheet", () => {
    const result = channelModalsReducer(initialChannelModalsState, { type: "showNotificationSheet" });
    expect(result.showNotificationSheet).toBe(true);

    const closed = channelModalsReducer(result, { type: "closeNotificationSheet" });
    expect(closed.showNotificationSheet).toBe(false);
  });

  it("handles showChannelInfo/closeChannelInfo", () => {
    const result = channelModalsReducer(initialChannelModalsState, { type: "showChannelInfo" });
    expect(result.showChannelInfo).toBe(true);

    const closed = channelModalsReducer(result, { type: "closeChannelInfo" });
    expect(closed.showChannelInfo).toBe(false);
  });

  it("handles closeAll preserving ephemeral messages", () => {
    const ephemeral: EphemeralMessage = {
      id: "eph-1",
      channelId: asChannelId("ch-1"),
      text: "keep me",
      senderName: "Slaqbot",
      senderAvatarUrl: null,
      createdAt: new Date().toISOString(),
      ephemeral: true,
    };

    let s = channelModalsReducer(initialChannelModalsState, { type: "addEphemeralMessages", messages: [ephemeral] });
    s = channelModalsReducer(s, { type: "showTopicEdit" });
    s = channelModalsReducer(s, { type: "showChannelInfo" });

    const closed = channelModalsReducer(s, { type: "closeAll" });
    expect(closed.showTopicEdit).toBe(false);
    expect(closed.showChannelInfo).toBe(false);
    expect(closed.ephemeralMessages).toHaveLength(0);
  });
});

describe("useChannelModals (context hook)", () => {
  it("returns initial state from context", () => {
    const { result } = renderHook(() => useChannelModals(), { wrapper });

    expect(result.current.state.editingMessage).toBeNull();
    expect(result.current.state.actionSheetMessage).toBeNull();
    expect(result.current.state.showEmojiPicker).toBe(false);
    expect(result.current.state.emojiPickerMessageId).toBeNull();
    expect(result.current.state.showTopicEdit).toBe(false);
    expect(result.current.state.showPinnedSheet).toBe(false);
    expect(result.current.state.pinnedMessages).toEqual([]);
    expect(result.current.state.pinnedLoading).toBe(false);
    expect(result.current.state.shareMessage).toBeNull();
    expect(result.current.state.ephemeralMessages).toEqual([]);
    expect(result.current.state.showNotificationSheet).toBe(false);
    expect(result.current.state.showChannelInfo).toBe(false);
  });

  it("dispatches actions and updates state via context", () => {
    const { result } = renderHook(() => useChannelModals(), { wrapper });
    const msg = makeMessage();

    act(() => {
      result.current.dispatch({ type: "showActionSheet", message: msg });
    });
    expect(result.current.state.actionSheetMessage).toBe(msg);

    act(() => {
      result.current.dispatch({ type: "closeActionSheet" });
    });
    expect(result.current.state.actionSheetMessage).toBeNull();
  });

  it("throws when used outside provider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useChannelModals());
    }).toThrow("useChannelModalsState must be used within ChannelModalsProvider");
    consoleSpy.mockRestore();
  });
});
