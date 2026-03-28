import React from "react";
import { StyleSheet } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MessageBubble } from "../MessageBubble";
import type { Message, CustomEmoji } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId, asEmojiId, asWorkspaceId } from "@openslaq/shared";

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
  } as Message;
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
    const onLongPress = jest.fn();
    const msg = makeMessage();

    render(
      <MessageBubble
        message={msg}
        currentUserId={asUserId("user-1")}
        onLongPress={onLongPress}
      />,
    );

    fireEvent(screen.getByTestId("message-bubble-msg-1"), "onLongPress");

    expect(onLongPress).toHaveBeenCalledWith(msg);
  });

  it("long-press triggers heavy haptic feedback", () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    const onLongPress = jest.fn();

    render(
      <MessageBubble
        message={makeMessage()}
        currentUserId={asUserId("user-1")}
        onLongPress={onLongPress}
      />,
    );

    fireEvent(screen.getByTestId("message-bubble-msg-1"), "onLongPress");

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Heavy);
  });

  it("long-press on other user's message still calls onLongPress", () => {
    const onLongPress = jest.fn();
    const msg = makeMessage({ userId: asUserId("other-user") });

    render(
      <MessageBubble
        message={msg}
        currentUserId={asUserId("user-1")}
        onLongPress={onLongPress}
      />,
    );

    fireEvent(screen.getByTestId("message-bubble-msg-1"), "onLongPress");

    expect(onLongPress).toHaveBeenCalledWith(msg);
  });

  it("regular press does not trigger onLongPress", () => {
    const onLongPress = jest.fn();

    render(
      <MessageBubble
        message={makeMessage()}
        currentUserId={asUserId("user-1")}
        onLongPress={onLongPress}
      />,
    );

    fireEvent.press(screen.getByTestId("message-bubble-msg-1"));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("applies highlighted styling when highlighted", () => {
    render(<MessageBubble message={makeMessage()} highlighted />);

    const bubble = screen.getByTestId("message-bubble-msg-1");
    const style = StyleSheet.flatten(bubble.props.style);
    expect(style.borderRadius).toBe(12);
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
        currentUserId={asUserId("user-1")}
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
        currentUserId={asUserId("user-1")}
        onToggleReaction={jest.fn()}
      />,
    );

    const activeReaction = screen.getByTestId("reaction-msg-1-👍");
    const inactiveReaction = screen.getByTestId("reaction-msg-1-❤️");

    // Active reaction should have borderWidth 1
    expect(StyleSheet.flatten(activeReaction.props.style)).toEqual(
      expect.objectContaining({ borderWidth: 1 }),
    );
    // Inactive reaction should have borderWidth 1 with non-active borderColor
    const inactiveStyle = StyleSheet.flatten(inactiveReaction.props.style);
    expect(inactiveStyle).toEqual(
      expect.objectContaining({ borderWidth: 1 }),
    );
    expect(inactiveStyle.borderColor).not.toBe("#1264a3");
  });

  it("shows add reaction button with SmilePlus icon when onToggleReaction is provided and reactions exist", () => {
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
    expect(screen.getByTestId("smile-plus-icon")).toBeTruthy();
  });

  it("pressing add reaction button calls onAddReaction instead of onLongPress", () => {
    const onAddReaction = jest.fn();
    const onLongPress = jest.fn();
    const msg = makeMessage({
      reactions: [
        { emoji: "👍", count: 1, userIds: [asUserId("u1")] },
      ],
    });

    render(
      <MessageBubble
        message={msg}
        onToggleReaction={jest.fn()}
        onAddReaction={onAddReaction}
        onLongPress={onLongPress}
      />,
    );

    fireEvent.press(screen.getByTestId("reaction-add-msg-1"));

    expect(onAddReaction).toHaveBeenCalledWith(msg);
    expect(onLongPress).not.toHaveBeenCalled();
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
        channelType: "public",
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

  describe("bot APP badge", () => {
    it("shows APP badge for bot messages", () => {
      const msg = makeMessage({ isBot: true, botAppId: "bot-1", actions: [] } as Partial<Message>);
      render(<MessageBubble message={msg} />);
      expect(screen.getByTestId("bot-badge-msg-1")).toBeTruthy();
      expect(screen.getByText("APP")).toBeTruthy();
    });

    it("does not show APP badge for regular messages", () => {
      render(<MessageBubble message={makeMessage()} />);
      expect(screen.queryByTestId("bot-badge-msg-1")).toBeNull();
    });
  });

  describe("bot action buttons", () => {
    it("renders action buttons for bot messages", () => {
      const msg = makeMessage({
        isBot: true,
        botAppId: "bot-1",
        actions: [
          { id: "a1", type: "button", label: "Approve", style: "primary" },
          { id: "a2", type: "button", label: "Reject", style: "danger" },
          { id: "a3", type: "button", label: "Details" },
        ],
      } as Partial<Message>);

      render(<MessageBubble message={msg} />);

      expect(screen.getByTestId("bot-actions-msg-1")).toBeTruthy();
      expect(screen.getByText("Approve")).toBeTruthy();
      expect(screen.getByText("Reject")).toBeTruthy();
      expect(screen.getByText("Details")).toBeTruthy();
    });

    it("calls onBotAction when action button pressed", () => {
      const onBotAction = jest.fn();
      const msg = makeMessage({
        isBot: true,
        botAppId: "bot-1",
        actions: [{ id: "a1", type: "button", label: "Approve", style: "primary" }],
      } as Partial<Message>);

      render(<MessageBubble message={msg} onBotAction={onBotAction} />);
      fireEvent.press(screen.getByTestId("bot-action-msg-1-a1"));

      expect(onBotAction).toHaveBeenCalledWith("msg-1", "a1");
    });

    it("does not render actions for regular messages", () => {
      render(<MessageBubble message={makeMessage()} />);
      expect(screen.queryByTestId("bot-actions-msg-1")).toBeNull();
    });
  });

  describe("sender status emoji", () => {
    it("renders status emoji when provided", () => {
      render(<MessageBubble message={makeMessage()} senderStatusEmoji="🏠" />);
      expect(screen.getByTestId("status-emoji-msg-1")).toBeTruthy();
      expect(screen.getByText("🏠")).toBeTruthy();
    });

    it("does not render status emoji when null", () => {
      render(<MessageBubble message={makeMessage()} senderStatusEmoji={null} />);
      expect(screen.queryByTestId("status-emoji-msg-1")).toBeNull();
    });
  });

  describe("pinned message highlight", () => {
    it("shows pinned badge for pinned messages", () => {
      const msg = makeMessage({ isPinned: true } as Partial<Message>);
      render(<MessageBubble message={msg} />);
      expect(screen.getByTestId("pinned-badge-msg-1")).toBeTruthy();
      expect(screen.getByText(/Pinned/)).toBeTruthy();
    });

    it("applies yellow background for pinned messages", () => {
      const msg = makeMessage({ isPinned: true } as Partial<Message>);
      render(<MessageBubble message={msg} />);
      const bubble = screen.getByTestId("message-bubble-msg-1");
      const style = StyleSheet.flatten(bubble.props.style);
      expect(style.backgroundColor).toBe("#fefce8");
    });

    it("does not show pinned badge for unpinned messages", () => {
      render(<MessageBubble message={makeMessage()} />);
      expect(screen.queryByTestId("pinned-badge-msg-1")).toBeNull();
    });
  });

  it("long-pressing a reaction pill calls onLongPressReaction", () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    const onLongPressReaction = jest.fn();
    const msg = makeMessage({
      reactions: [
        { emoji: "👍", count: 2, userIds: [asUserId("u1"), asUserId("u2")] },
      ],
    });

    render(
      <MessageBubble
        message={msg}
        onToggleReaction={jest.fn()}
        onLongPressReaction={onLongPressReaction}
      />,
    );

    fireEvent(screen.getByTestId("reaction-msg-1-👍"), "onLongPress");

    expect(onLongPressReaction).toHaveBeenCalledWith(msg, "👍");
    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
  });

  describe("reaction pill sizing", () => {
    it("renders reaction pills with larger tap-friendly padding", () => {
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

      const pill = screen.getByTestId("reaction-msg-1-👍");
      const style = StyleSheet.flatten(pill.props.style);
      expect(style.paddingHorizontal).toBe(10);
      expect(style.paddingVertical).toBe(4);
    });

    it("renders reaction emoji with larger font size", () => {
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

      const emojiText = screen.getByText("👍");
      const style = StyleSheet.flatten(emojiText.props.style);
      expect(style.fontSize).toBe(16);
    });

    it("renders add reaction button with matching larger padding", () => {
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

      const addBtn = screen.getByTestId("reaction-add-msg-1");
      const style = StyleSheet.flatten(addBtn.props.style);
      expect(style.paddingHorizontal).toBe(10);
      expect(style.paddingVertical).toBe(4);
    });
  });

  describe("custom emoji reactions", () => {
    const customEmojis: CustomEmoji[] = [
      {
        id: asEmojiId("emoji-1"),
        workspaceId: asWorkspaceId("ws-1"),
        name: "party-parrot",
        url: "https://cdn.test/party-parrot.png",
        uploadedBy: asUserId("user-1"),
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    it("renders custom emoji reaction as Image", () => {
      const msg = makeMessage({
        reactions: [
          { emoji: ":custom:party-parrot:", count: 1, userIds: [asUserId("u1")] },
        ],
      });

      render(
        <MessageBubble
          message={msg}
          customEmojis={customEmojis}
          onToggleReaction={jest.fn()}
        />,
      );

      expect(screen.getByTestId("custom-reaction-party-parrot")).toBeTruthy();
    });

    it("renders unknown custom emoji as text fallback", () => {
      const msg = makeMessage({
        reactions: [
          { emoji: ":custom:unknown-emoji:", count: 1, userIds: [asUserId("u1")] },
        ],
      });

      render(
        <MessageBubble
          message={msg}
          customEmojis={customEmojis}
          onToggleReaction={jest.fn()}
        />,
      );

      expect(screen.queryByTestId("custom-reaction-unknown-emoji")).toBeNull();
      expect(screen.getByText(":unknown-emoji:")).toBeTruthy();
    });

    it("renders standard emoji normally when customEmojis provided", () => {
      const msg = makeMessage({
        reactions: [
          { emoji: "👍", count: 2, userIds: [asUserId("u1"), asUserId("u2")] },
        ],
      });

      render(
        <MessageBubble
          message={msg}
          customEmojis={customEmojis}
          onToggleReaction={jest.fn()}
        />,
      );

      expect(screen.getByText("👍")).toBeTruthy();
    });
  });
});
