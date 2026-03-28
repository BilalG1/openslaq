import React from "react";
import { render, screen } from "@testing-library/react-native";
import type { ChannelEventMessage, ChannelId, MessageId, UserId } from "@openslaq/shared";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        textFaint: "#999",
      },
    },
  }),
}));

import { ChannelEventSystemMessage } from "../ChannelEventSystemMessage";

function makeMessage(overrides: Partial<ChannelEventMessage> = {}): ChannelEventMessage {
  return {
    id: "msg-1" as unknown as MessageId,
    channelId: "ch-1" as unknown as ChannelId,
    userId: "user-123" as unknown as UserId,
    content: "",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    createdAt: "2026-03-17T12:00:00Z",
    updatedAt: "2026-03-17T12:00:00Z",
    type: "channel_event",
    metadata: { action: "joined" },
    ...overrides,
  } as ChannelEventMessage;
}

describe("ChannelEventSystemMessage", () => {
  it("renders with testID", () => {
    render(<ChannelEventSystemMessage message={makeMessage()} />);
    expect(screen.getByTestId("channel-event-system-message")).toBeTruthy();
  });

  it('shows "joined the channel" for joined action', () => {
    render(<ChannelEventSystemMessage message={makeMessage({ metadata: { action: "joined" } })} />);
    expect(screen.getByText(/joined the channel/)).toBeTruthy();
  });

  it('shows "left the channel" for left action', () => {
    render(<ChannelEventSystemMessage message={makeMessage({ metadata: { action: "left" } })} />);
    expect(screen.getByText(/left the channel/)).toBeTruthy();
  });

  it("shows senderDisplayName when present", () => {
    render(
      <ChannelEventSystemMessage
        message={makeMessage({ senderDisplayName: "Alice" })}
      />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("falls back to userId when senderDisplayName is undefined", () => {
    render(
      <ChannelEventSystemMessage
        message={makeMessage({ senderDisplayName: undefined, userId: "user-456" as unknown as UserId })}
      />,
    );
    expect(screen.getByText("user-456")).toBeTruthy();
  });
});
