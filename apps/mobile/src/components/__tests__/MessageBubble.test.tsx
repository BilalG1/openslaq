import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

// Mock MessageContent to render plain text for unit testing
jest.mock("../MessageContent", () => {
  const { Text } = require("react-native");
  return {
    MessageContent: ({ content }: { content: string }) => <Text>{content}</Text>,
  };
});

jest.mock("../SharedMessageCard", () => {
  const { View, Text } = require("react-native");
  return {
    SharedMessageCard: ({ sharedMessage }: { sharedMessage: { content: string } }) => (
      <View testID="shared-message-card">
        <Text>{sharedMessage.content}</Text>
      </View>
    ),
  };
});

jest.mock("../MessageAttachments", () => {
  const { View, Text } = require("react-native");
  return {
    MessageAttachments: ({ attachments }: { attachments: unknown[] }) => (
      <View testID="message-attachments">
        <Text>{attachments.length} attachments</Text>
      </View>
    ),
  };
});

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    senderDisplayName: "Alice",
    content: "Hello world",
    createdAt: "2025-01-01T12:00:00Z",
    updatedAt: "2025-01-01T12:00:00Z",
    parentMessageId: null,
    latestReplyAt: null,
    reactions: [],
    replyCount: 0,
    attachments: [],
    mentions: [],
    ...overrides,
  };
}

describe("MessageBubble", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sender name and content", () => {
    render(<MessageBubble message={makeMessage()} />);

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it('shows "Unknown" when no sender name', () => {
    render(
      <MessageBubble message={makeMessage({ senderDisplayName: undefined })} />,
    );

    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("renders reactions when present", () => {
    render(
      <MessageBubble
        message={makeMessage({
          reactions: [
            { emoji: "👍", count: 3, userIds: [asUserId("u1"), asUserId("u2"), asUserId("u3")] },
            { emoji: "❤️", count: 1, userIds: [asUserId("u1")] },
          ],
        })}
      />,
    );

    expect(screen.getByText("👍")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("❤️")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("hides reactions when empty", () => {
    render(<MessageBubble message={makeMessage({ reactions: [] })} />);

    expect(screen.queryByText("👍")).toBeNull();
  });

  it("renders reply count singular", () => {
    render(<MessageBubble message={makeMessage({ replyCount: 1 })} />);

    expect(screen.getByText("1 reply")).toBeTruthy();
  });

  it("renders reply count plural", () => {
    render(<MessageBubble message={makeMessage({ replyCount: 5 })} />);

    expect(screen.getByText("5 replies")).toBeTruthy();
  });

  it("hides reply count when zero", () => {
    render(<MessageBubble message={makeMessage({ replyCount: 0 })} />);

    expect(screen.queryByText(/repl/)).toBeNull();
  });

  it('shows "(edited)" when updatedAt > createdAt', () => {
    render(
      <MessageBubble
        message={makeMessage({
          createdAt: "2025-01-01T12:00:00Z",
          updatedAt: "2025-01-01T12:05:00Z",
        })}
      />,
    );

    expect(screen.getByTestId("message-edited-msg-1")).toBeTruthy();
    expect(screen.getByText("(edited)")).toBeTruthy();
  });

  it('hides "(edited)" when timestamps are equal', () => {
    render(
      <MessageBubble
        message={makeMessage({
          createdAt: "2025-01-01T12:00:00Z",
          updatedAt: "2025-01-01T12:00:00Z",
        })}
      />,
    );

    expect(screen.queryByText("(edited)")).toBeNull();
  });

  it("long-press calls onLongPress with the message", () => {
    jest.useFakeTimers();
    const onLongPress = jest.fn();
    const msg = makeMessage();

    render(
      <MessageBubble
        message={msg}
        currentUserId="user-1"
        onLongPress={onLongPress}
      />,
    );

    // The component uses onTouchStart + setTimeout for long press
    fireEvent(screen.getByTestId("message-bubble-msg-1"), "touchStart");
    act(() => jest.advanceTimersByTime(400));

    expect(onLongPress).toHaveBeenCalledWith(msg);
    jest.useRealTimers();
  });

  it("long-press on other user's message still calls onLongPress", () => {
    jest.useFakeTimers();
    const onLongPress = jest.fn();
    const msg = makeMessage({ userId: asUserId("other-user") });

    render(
      <MessageBubble
        message={msg}
        currentUserId="user-1"
        onLongPress={onLongPress}
      />,
    );

    fireEvent(screen.getByTestId("message-bubble-msg-1"), "touchStart");
    act(() => jest.advanceTimersByTime(400));

    expect(onLongPress).toHaveBeenCalledWith(msg);
    jest.useRealTimers();
  });

  it("tapping reaction pill calls onToggleReaction", () => {
    const onToggleReaction = jest.fn();
    const msg = makeMessage({
      reactions: [
        { emoji: "👍", count: 2, userIds: [asUserId("u1"), asUserId("u2")] },
      ],
    });

    render(
      <MessageBubble
        message={msg}
        currentUserId="user-1"
        onToggleReaction={onToggleReaction}
      />,
    );

    fireEvent.press(screen.getByTestId("reaction-msg-1-👍"));

    expect(onToggleReaction).toHaveBeenCalledWith("msg-1", "👍");
  });

  it("shows active styling when currentUserId is in reaction userIds", () => {
    const msg = makeMessage({
      reactions: [
        { emoji: "👍", count: 1, userIds: [asUserId("user-1")] },
        { emoji: "❤️", count: 1, userIds: [asUserId("other")] },
      ],
    });

    render(
      <MessageBubble
        message={msg}
        currentUserId="user-1"
        onToggleReaction={jest.fn()}
      />,
    );

    const activeReaction = screen.getByTestId("reaction-msg-1-👍");
    const inactiveReaction = screen.getByTestId("reaction-msg-1-❤️");

    // Active reaction should have borderWidth 1
    expect(activeReaction.props.style).toEqual(
      expect.objectContaining({ borderWidth: 1 }),
    );
    // Inactive reaction should have borderWidth 0
    expect(inactiveReaction.props.style).toEqual(
      expect.objectContaining({ borderWidth: 0 }),
    );
  });

  it("shows + button when onToggleReaction is provided and reactions exist", () => {
    const msg = makeMessage({
      reactions: [
        { emoji: "👍", count: 1, userIds: [asUserId("u1")] },
      ],
    });

    render(
      <MessageBubble
        message={msg}
        onToggleReaction={jest.fn()}
      />,
    );

    expect(screen.getByTestId("reaction-add-msg-1")).toBeTruthy();
  });

  it("hides + button when onToggleReaction is not provided", () => {
    const msg = makeMessage({
      reactions: [
        { emoji: "👍", count: 1, userIds: [asUserId("u1")] },
      ],
    });

    render(<MessageBubble message={msg} />);

    expect(screen.queryByTestId("reaction-add-msg-1")).toBeNull();
  });

  it("renders MessageAttachments when attachments are present", () => {
    const msg = makeMessage({
      attachments: [
        {
          id: "att-1" as never,
          messageId: "msg-1" as never,
          filename: "test.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          uploadedBy: "user-1" as never,
          createdAt: "2025-01-01T00:00:00Z",
          downloadUrl: "http://api.test/api/uploads/att-1/download",
        },
      ],
    });

    render(<MessageBubble message={msg} />);

    expect(screen.getByTestId("message-attachments")).toBeTruthy();
    expect(screen.getByText("1 attachments")).toBeTruthy();
  });

  it("does not render MessageAttachments when attachments are empty", () => {
    render(<MessageBubble message={makeMessage({ attachments: [] })} />);

    expect(screen.queryByTestId("message-attachments")).toBeNull();
  });

  it("calls onPressSender with userId when sender name is tapped", () => {
    const onPressSender = jest.fn();
    const msg = makeMessage({ userId: asUserId("user-42") });

    render(
      <MessageBubble
        message={msg}
        onPressSender={onPressSender}
      />,
    );

    fireEvent.press(screen.getByTestId("sender-name-msg-1"));
    expect(onPressSender).toHaveBeenCalledWith("user-42");
  });

  it("renders SharedMessageCard when sharedMessage is present", () => {
    const msg = makeMessage({
      sharedMessage: {
        id: asMessageId("shared-1"),
        channelId: asChannelId("ch-2"),
        channelName: "general",
        userId: asUserId("user-2"),
        senderDisplayName: "Bob",
        senderAvatarUrl: null,
        content: "Shared content",
        createdAt: "2025-01-01T12:00:00Z",
      },
    });

    render(<MessageBubble message={msg} />);

    expect(screen.getByTestId("shared-message-card")).toBeTruthy();
    expect(screen.getByText("Shared content")).toBeTruthy();
  });

  it("does not render SharedMessageCard when sharedMessage is absent", () => {
    render(<MessageBubble message={makeMessage()} />);

    expect(screen.queryByTestId("shared-message-card")).toBeNull();
  });

  it("does not crash when sender name is tapped without onPressSender", () => {
    const msg = makeMessage();

    render(<MessageBubble message={msg} />);

    // Should not throw
    fireEvent.press(screen.getByTestId("sender-name-msg-1"));
  });
});
