import { renderHook, act } from "@testing-library/react-native";
import { useChannelModals } from "../useChannelModals";
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

describe("useChannelModals", () => {
  it("returns all modal state with correct initial values", () => {
    const { result } = renderHook(() => useChannelModals());

    expect(result.current.editingMessage).toBeNull();
    expect(result.current.actionSheetMessage).toBeNull();
    expect(result.current.showEmojiPicker).toBe(false);
    expect(result.current.emojiPickerMessageId).toBeNull();
    expect(result.current.showTopicEdit).toBe(false);
    expect(result.current.showPinnedSheet).toBe(false);
    expect(result.current.pinnedMessages).toEqual([]);
    expect(result.current.pinnedLoading).toBe(false);
    expect(result.current.shareMessage).toBeNull();
    expect(result.current.ephemeralMessages).toEqual([]);
    expect(result.current.showNotificationSheet).toBe(false);
    expect(result.current.showChannelInfo).toBe(false);
  });

  it("sets and clears editingMessage", () => {
    const { result } = renderHook(() => useChannelModals());

    act(() => {
      result.current.setEditingMessage({ id: "msg-1", content: "hello" });
    });
    expect(result.current.editingMessage).toEqual({ id: "msg-1", content: "hello" });

    act(() => {
      result.current.setEditingMessage(null);
    });
    expect(result.current.editingMessage).toBeNull();
  });

  it("sets and clears actionSheetMessage", () => {
    const { result } = renderHook(() => useChannelModals());
    const msg = makeMessage();

    act(() => {
      result.current.setActionSheetMessage(msg);
    });
    expect(result.current.actionSheetMessage).toBe(msg);

    act(() => {
      result.current.setActionSheetMessage(null);
    });
    expect(result.current.actionSheetMessage).toBeNull();
  });

  it("toggles showEmojiPicker", () => {
    const { result } = renderHook(() => useChannelModals());

    act(() => {
      result.current.setShowEmojiPicker(true);
    });
    expect(result.current.showEmojiPicker).toBe(true);

    act(() => {
      result.current.setShowEmojiPicker(false);
    });
    expect(result.current.showEmojiPicker).toBe(false);
  });

  it("sets emojiPickerMessageId", () => {
    const { result } = renderHook(() => useChannelModals());

    act(() => {
      result.current.setEmojiPickerMessageId("msg-42");
    });
    expect(result.current.emojiPickerMessageId).toBe("msg-42");
  });

  it("toggles showTopicEdit", () => {
    const { result } = renderHook(() => useChannelModals());

    act(() => {
      result.current.setShowTopicEdit(true);
    });
    expect(result.current.showTopicEdit).toBe(true);
  });

  it("manages pinned messages state", () => {
    const { result } = renderHook(() => useChannelModals());
    const msgs = [makeMessage({ id: asMessageId("p1") }), makeMessage({ id: asMessageId("p2") })];

    act(() => {
      result.current.setShowPinnedSheet(true);
      result.current.setPinnedLoading(true);
    });
    expect(result.current.showPinnedSheet).toBe(true);
    expect(result.current.pinnedLoading).toBe(true);

    act(() => {
      result.current.setPinnedMessages(msgs);
      result.current.setPinnedLoading(false);
    });
    expect(result.current.pinnedMessages).toEqual(msgs);
    expect(result.current.pinnedLoading).toBe(false);
  });

  it("sets and clears shareMessage", () => {
    const { result } = renderHook(() => useChannelModals());
    const msg = makeMessage();

    act(() => {
      result.current.setShareMessage(msg);
    });
    expect(result.current.shareMessage).toBe(msg);

    act(() => {
      result.current.setShareMessage(null);
    });
    expect(result.current.shareMessage).toBeNull();
  });

  it("manages ephemeral messages with functional updates", () => {
    const { result } = renderHook(() => useChannelModals());
    const ephemeral: EphemeralMessage = {
      id: "eph-1",
      channelId: asChannelId("ch-1"),
      text: "Only you can see this",
      senderName: "Slaqbot",
      senderAvatarUrl: null,
      createdAt: new Date().toISOString(),
      ephemeral: true,
    };

    act(() => {
      result.current.setEphemeralMessages((prev) => [...prev, ephemeral]);
    });
    expect(result.current.ephemeralMessages).toHaveLength(1);
    expect(result.current.ephemeralMessages[0].id).toBe("eph-1");
  });

  it("toggles showNotificationSheet", () => {
    const { result } = renderHook(() => useChannelModals());

    act(() => {
      result.current.setShowNotificationSheet(true);
    });
    expect(result.current.showNotificationSheet).toBe(true);
  });

  it("toggles showChannelInfo", () => {
    const { result } = renderHook(() => useChannelModals());

    act(() => {
      result.current.setShowChannelInfo(true);
    });
    expect(result.current.showChannelInfo).toBe(true);

    act(() => {
      result.current.setShowChannelInfo(false);
    });
    expect(result.current.showChannelInfo).toBe(false);
  });

  it("setPinnedMessages supports functional updates for filtering", () => {
    const { result } = renderHook(() => useChannelModals());
    const msgs = [makeMessage({ id: asMessageId("p1") }), makeMessage({ id: asMessageId("p2") })];

    act(() => {
      result.current.setPinnedMessages(msgs);
    });
    expect(result.current.pinnedMessages).toHaveLength(2);

    act(() => {
      result.current.setPinnedMessages((prev) => prev.filter((m) => m.id !== "p1"));
    });
    expect(result.current.pinnedMessages).toHaveLength(1);
    expect(result.current.pinnedMessages[0].id).toBe("p2");
  });
});
