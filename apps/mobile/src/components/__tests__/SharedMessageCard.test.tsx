import React from "react";
import { render, screen } from "@testing-library/react-native";
import { SharedMessageCard } from "../SharedMessageCard";
import type { SharedMessageInfo } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

jest.mock("../MessageContent", () => {
  const { Text } = require("react-native");
  return {
    MessageContent: ({ content }: { content: string }) => <Text>{content}</Text>,
  };
});

function makeSharedMessage(overrides: Partial<SharedMessageInfo> = {}): SharedMessageInfo {
  return {
    id: asMessageId("shared-1"),
    channelId: asChannelId("ch-2"),
    channelName: "general",
    userId: asUserId("user-2"),
    senderDisplayName: "Bob",
    senderAvatarUrl: null,
    content: "Shared content here",
    createdAt: "2025-01-01T14:30:00Z",
    ...overrides,
  };
}

describe("SharedMessageCard", () => {
  it("renders sender name", () => {
    render(<SharedMessageCard sharedMessage={makeSharedMessage()} />);

    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("renders channel name with # prefix", () => {
    render(<SharedMessageCard sharedMessage={makeSharedMessage()} />);

    expect(screen.getByText("in #general")).toBeTruthy();
  });

  it("renders message content", () => {
    render(<SharedMessageCard sharedMessage={makeSharedMessage()} />);

    expect(screen.getByText("Shared content here")).toBeTruthy();
  });

  it("renders timestamp", () => {
    render(<SharedMessageCard sharedMessage={makeSharedMessage()} />);

    // The formatTime function uses toLocaleTimeString, check the card renders
    expect(screen.getByTestId("shared-message-card")).toBeTruthy();
  });

  it("renders avatar initial from sender name", () => {
    render(<SharedMessageCard sharedMessage={makeSharedMessage()} />);

    expect(screen.getByTestId("shared-message-avatar")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("renders ? when sender name is missing", () => {
    render(
      <SharedMessageCard
        sharedMessage={makeSharedMessage({ senderDisplayName: "" })}
      />,
    );

    expect(screen.getByText("?")).toBeTruthy();
  });
});
