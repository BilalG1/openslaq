import { act, renderHook } from "@/test-utils";
import { asChannelId, asMessageId, asUserId } from "@openslaq/shared";
import type { Message } from "@openslaq/shared";
import { useMessageScrollTarget } from "../useMessageScrollTarget";

function makeMessage(id: string): Message {
  return {
    id: asMessageId(id),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    senderDisplayName: "Alice",
    content: `Message ${id}`,
    createdAt: "2025-01-01T12:00:00Z",
    updatedAt: "2025-01-01T12:00:00Z",
    parentMessageId: null,
    latestReplyAt: null,
    reactions: [],
    replyCount: 0,
    attachments: [],
    mentions: [],
  } as Message;
}

describe("useMessageScrollTarget", () => {
  const originalRAF = global.requestAnimationFrame;

  beforeEach(() => {
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
    jest.clearAllMocks();
  });

  it("scrolls to the target, highlights it, and resolves the target", () => {
    const scrollToIndex = jest.fn();
    const onLoadOlder = jest.fn();
    const onResolve = jest.fn();
    const onExhausted = jest.fn();

    renderHook(() =>
      useMessageScrollTarget({
        scrollTarget: {
          channelId: "ch-1",
          messageId: "msg-2",
          highlightMessageId: "msg-2",
          parentMessageId: null,
        },
        messages: [makeMessage("msg-1"), makeMessage("msg-2")],
        listRef: { current: { scrollToIndex } } as never,
        isInitialLoading: false,
        canLoadOlder: true,
        loadingOlder: false,
        onLoadOlder,
        onResolve,
        onExhausted,
      }),
    );

    expect(scrollToIndex).toHaveBeenCalledWith({
      index: 1,
      animated: false,
      viewPosition: 0.5,
    });
    expect(onResolve).toHaveBeenCalledWith("msg-2");
    expect(onLoadOlder).not.toHaveBeenCalled();
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("loads older messages when the target is missing and pagination remains", () => {
    const onLoadOlder = jest.fn();

    renderHook(() =>
      useMessageScrollTarget({
        scrollTarget: {
          channelId: "ch-1",
          messageId: "msg-9",
          highlightMessageId: "msg-9",
          parentMessageId: null,
        },
        messages: [makeMessage("msg-1")],
        listRef: { current: { scrollToIndex: jest.fn() } } as never,
        isInitialLoading: false,
        canLoadOlder: true,
        loadingOlder: false,
        onLoadOlder,
        onResolve: jest.fn(),
        onExhausted: jest.fn(),
      }),
    );

    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("clears the target when pagination is exhausted without a match", () => {
    const onExhausted = jest.fn();

    renderHook(() =>
      useMessageScrollTarget({
        scrollTarget: {
          channelId: "ch-1",
          messageId: "msg-9",
          highlightMessageId: "msg-9",
          parentMessageId: null,
        },
        messages: [makeMessage("msg-1")],
        listRef: { current: { scrollToIndex: jest.fn() } } as never,
        isInitialLoading: false,
        canLoadOlder: false,
        loadingOlder: false,
        onLoadOlder: jest.fn(),
        onResolve: jest.fn(),
        onExhausted,
      }),
    );

    expect(onExhausted).toHaveBeenCalledTimes(1);
  });

  it("does not re-fire onLoadOlder when callbacks change references (un-memoized)", () => {
    const onLoadOlder = jest.fn();

    const baseProps = {
      scrollTarget: {
        channelId: "ch-1",
        messageId: "msg-9",
        highlightMessageId: "msg-9",
        parentMessageId: null,
      },
      messages: [makeMessage("msg-1")],
      listRef: { current: { scrollToIndex: jest.fn() } } as never,
      isInitialLoading: false,
      canLoadOlder: true,
      loadingOlder: false,
      onResolve: jest.fn(),
      onExhausted: jest.fn(),
    };

    const { rerender } = renderHook(
      (props: { onLoadOlder: () => void }) =>
        useMessageScrollTarget({ ...baseProps, ...props }),
      { initialProps: { onLoadOlder } },
    );

    expect(onLoadOlder).toHaveBeenCalledTimes(1);

    // Rerender with a new function reference (simulating inline arrow)
    const onLoadOlder2 = jest.fn();
    act(() => {
      rerender({ onLoadOlder: onLoadOlder2 });
    });

    // Should NOT have called the new callback — deps haven't changed
    expect(onLoadOlder2).not.toHaveBeenCalled();
  });

  it("does not re-fire onExhausted on re-renders with new callback references", () => {
    const onExhausted = jest.fn();

    const baseProps = {
      scrollTarget: {
        channelId: "ch-1",
        messageId: "msg-9",
        highlightMessageId: "msg-9",
        parentMessageId: null,
      },
      messages: [makeMessage("msg-1")],
      listRef: { current: { scrollToIndex: jest.fn() } } as never,
      isInitialLoading: false,
      canLoadOlder: false,
      loadingOlder: false,
      onLoadOlder: jest.fn(),
      onResolve: jest.fn(),
    };

    const { rerender } = renderHook(
      (props: { onExhausted: () => void }) =>
        useMessageScrollTarget({ ...baseProps, ...props }),
      { initialProps: { onExhausted } },
    );

    expect(onExhausted).toHaveBeenCalledTimes(1);

    const onExhausted2 = jest.fn();
    act(() => {
      rerender({ onExhausted: onExhausted2 });
    });

    expect(onExhausted2).not.toHaveBeenCalled();
  });

  it("waits for initial loading to finish before acting", () => {
    const onLoadOlder = jest.fn();
    const onResolve = jest.fn();

    const { rerender } = renderHook(
      ({ isInitialLoading }) =>
        useMessageScrollTarget({
          scrollTarget: {
            channelId: "ch-1",
            messageId: "msg-1",
            highlightMessageId: "msg-1",
            parentMessageId: null,
          },
          messages: [makeMessage("msg-1")],
          listRef: { current: { scrollToIndex: jest.fn() } } as never,
          isInitialLoading,
          canLoadOlder: true,
          loadingOlder: false,
          onLoadOlder,
          onResolve,
          onExhausted: jest.fn(),
        }),
      { initialProps: { isInitialLoading: true } },
    );

    expect(onResolve).not.toHaveBeenCalled();

    act(() => {
      rerender({ isInitialLoading: false });
    });

    expect(onResolve).toHaveBeenCalledWith("msg-1");
    expect(onLoadOlder).not.toHaveBeenCalled();
  });
});
