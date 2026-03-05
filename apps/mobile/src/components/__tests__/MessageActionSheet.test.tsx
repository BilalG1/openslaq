import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MessageActionSheet } from "../MessageActionSheet";
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
    ...overrides,
  } as Message;
}

const defaultProps = {
  visible: true,
  onReaction: jest.fn(),
  onOpenEmojiPicker: jest.fn(),
  onEditMessage: jest.fn(),
  onDeleteMessage: jest.fn(),
  onPinMessage: jest.fn(),
  onUnpinMessage: jest.fn(),
  onSaveMessage: jest.fn(),
  onUnsaveMessage: jest.fn(),
  onCopyText: jest.fn(),
  onCopyLink: jest.fn(),
  onClose: jest.fn(),
};

describe("MessageActionSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders quick reaction buttons", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("quick-reaction-✅")).toBeTruthy();
    expect(screen.getByTestId("quick-reaction-👀")).toBeTruthy();
    expect(screen.getByTestId("quick-reaction-🙌")).toBeTruthy();
    expect(screen.getByTestId("quick-reaction-picker")).toBeTruthy();
  });

  it("tapping quick reaction calls onReaction and onClose", () => {
    const onReaction = jest.fn();
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onReaction={onReaction}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("quick-reaction-✅"));

    expect(onReaction).toHaveBeenCalledWith("msg-1", "✅");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows edit/delete for own messages", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ userId: asUserId("user-1") })}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("action-edit-message")).toBeTruthy();
    expect(screen.getByTestId("action-delete-message")).toBeTruthy();
  });

  it("hides edit/delete for other users messages", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ userId: asUserId("other-user") })}
        currentUserId="user-1"
      />,
    );

    expect(screen.queryByTestId("action-edit-message")).toBeNull();
    expect(screen.queryByTestId("action-delete-message")).toBeNull();
  });

  it("tapping edit calls onEditMessage and onClose", () => {
    const onEditMessage = jest.fn();
    const onClose = jest.fn();
    const msg = makeMessage();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={msg}
        currentUserId="user-1"
        onEditMessage={onEditMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-edit-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onEditMessage).toHaveBeenCalledWith(msg);
  });

  it("tapping delete shows confirmation alert", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-delete-message"));

    expect(onClose).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Message",
      "Are you sure you want to delete this message?",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Delete" }),
      ]),
    );
  });

  it("backdrop tap calls onClose", () => {
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-sheet-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });

  it("returns null when message is null", () => {
    const { toJSON } = render(
      <MessageActionSheet
        {...defaultProps}
        message={null}
        currentUserId="user-1"
      />,
    );

    expect(toJSON()).toBeNull();
  });

  // Pin/Unpin tests
  it("shows Pin Message action for unpinned messages", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ isPinned: false })}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("action-pin-message")).toBeTruthy();
    expect(screen.getByText("Pin Message")).toBeTruthy();
    expect(screen.queryByTestId("action-unpin-message")).toBeNull();
  });

  it("shows Unpin Message action for pinned messages", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ isPinned: true })}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("action-unpin-message")).toBeTruthy();
    expect(screen.getByText("Unpin Message")).toBeTruthy();
    expect(screen.queryByTestId("action-pin-message")).toBeNull();
  });

  it("shows Pin Message for other users' messages too", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ userId: asUserId("other-user"), isPinned: false })}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("action-pin-message")).toBeTruthy();
  });

  it("calls onPinMessage when pin is pressed", () => {
    const onPinMessage = jest.fn();
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ isPinned: false })}
        currentUserId="user-1"
        onPinMessage={onPinMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-pin-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onPinMessage).toHaveBeenCalledWith("msg-1");
  });

  it("calls onUnpinMessage when unpin is pressed", () => {
    const onUnpinMessage = jest.fn();
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ isPinned: true })}
        currentUserId="user-1"
        onUnpinMessage={onUnpinMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-unpin-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onUnpinMessage).toHaveBeenCalledWith("msg-1");
  });

  // Save/Unsave tests
  it("shows Save for Later when isSaved is false", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        isSaved={false}
      />,
    );

    expect(screen.getByTestId("action-save-message")).toBeTruthy();
    expect(screen.getByText("Save for Later")).toBeTruthy();
    expect(screen.queryByTestId("action-unsave-message")).toBeNull();
  });

  it("shows Remove from Saved when isSaved is true", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        isSaved={true}
      />,
    );

    expect(screen.getByTestId("action-unsave-message")).toBeTruthy();
    expect(screen.getByText("Remove from Saved")).toBeTruthy();
    expect(screen.queryByTestId("action-save-message")).toBeNull();
  });

  it("calls onSaveMessage with message ID", () => {
    const onSaveMessage = jest.fn();
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        isSaved={false}
        onSaveMessage={onSaveMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-save-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onSaveMessage).toHaveBeenCalledWith("msg-1");
  });

  it("calls onUnsaveMessage with message ID", () => {
    const onUnsaveMessage = jest.fn();
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        isSaved={true}
        onUnsaveMessage={onUnsaveMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-unsave-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onUnsaveMessage).toHaveBeenCalledWith("msg-1");
  });

  // Copy tests
  it("shows Copy Text and calls onCopyText with message", () => {
    const onCopyText = jest.fn();
    const onClose = jest.fn();
    const msg = makeMessage();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={msg}
        currentUserId="user-1"
        onCopyText={onCopyText}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId("action-copy-text")).toBeTruthy();
    expect(screen.getByText("Copy Text")).toBeTruthy();

    fireEvent.press(screen.getByTestId("action-copy-text"));

    expect(onClose).toHaveBeenCalled();
    expect(onCopyText).toHaveBeenCalledWith(msg);
  });

  it("shows Copy Link and calls onCopyLink with message", () => {
    const onCopyLink = jest.fn();
    const onClose = jest.fn();
    const msg = makeMessage();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={msg}
        currentUserId="user-1"
        onCopyLink={onCopyLink}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId("action-copy-link")).toBeTruthy();
    expect(screen.getByText("Copy Link")).toBeTruthy();

    fireEvent.press(screen.getByTestId("action-copy-link"));

    expect(onClose).toHaveBeenCalled();
    expect(onCopyLink).toHaveBeenCalledWith(msg);
  });

  // Share Message tests
  it("shows Share Message when onShareMessage is provided", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onShareMessage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("action-share-message")).toBeTruthy();
    expect(screen.getByText("Share Message")).toBeTruthy();
  });

  it("hides Share Message when onShareMessage is not provided", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
      />,
    );

    expect(screen.queryByTestId("action-share-message")).toBeNull();
  });

  it("tapping Share Message calls onClose and onShareMessage with the message", () => {
    const onShareMessage = jest.fn();
    const onClose = jest.fn();
    const msg = makeMessage();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={msg}
        currentUserId="user-1"
        onShareMessage={onShareMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-share-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onShareMessage).toHaveBeenCalledWith(msg);
  });
});
