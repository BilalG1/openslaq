import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PinnedMessagesSheet } from "../PinnedMessagesSheet";
import type { Message } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

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
    isPinned: true,
    ...overrides,
  } as Message;
}

const defaultProps = {
  visible: true,
  loading: false,
  onUnpin: jest.fn(),
  onClose: jest.fn(),
};

describe("PinnedMessagesSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders pinned messages", () => {
    const messages = [
      makeMessage({ id: asMessageId("msg-1"), senderDisplayName: "Alice", content: "Pinned content 1" }),
      makeMessage({ id: asMessageId("msg-2"), senderDisplayName: "Bob", content: "Pinned content 2" }),
    ];

    render(<PinnedMessagesSheet {...defaultProps} messages={messages} />);

    expect(screen.getByText("Pinned Messages")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Pinned content 1")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Pinned content 2")).toBeTruthy();
  });

  it("shows empty state when no pinned messages", () => {
    render(<PinnedMessagesSheet {...defaultProps} messages={[]} />);

    expect(screen.getByTestId("pinned-empty")).toBeTruthy();
    expect(screen.getByText("No pinned messages")).toBeTruthy();
  });

  it("shows loading spinner", () => {
    render(<PinnedMessagesSheet {...defaultProps} messages={[]} loading={true} />);

    expect(screen.getByTestId("pinned-loading")).toBeTruthy();
  });

  it("calls onUnpin when unpin button is pressed", () => {
    const onUnpin = jest.fn();
    const messages = [makeMessage({ id: asMessageId("msg-1") })];

    render(<PinnedMessagesSheet {...defaultProps} messages={messages} onUnpin={onUnpin} />);

    fireEvent.press(screen.getByTestId("unpin-button-msg-1"));

    expect(onUnpin).toHaveBeenCalledWith("msg-1");
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();

    render(<PinnedMessagesSheet {...defaultProps} messages={[]} onClose={onClose} />);

    fireEvent.press(screen.getByTestId("pinned-sheet-close"));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();

    render(<PinnedMessagesSheet {...defaultProps} messages={[]} onClose={onClose} />);

    fireEvent.press(screen.getByTestId("pinned-sheet-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });
});
