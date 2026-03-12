import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EphemeralMessageBubble } from "../EphemeralMessageBubble";
import type { EphemeralMessage } from "@openslaq/shared";
import type { ChannelId } from "@openslaq/shared";

const mockMessage: EphemeralMessage = {
  id: "eph-1",
  channelId: "ch-1" as ChannelId,
  text: "Reminder set for tomorrow at 9am",
  senderName: "Slaqbot",
  senderAvatarUrl: null,
  createdAt: "2026-03-09T12:00:00Z",
  ephemeral: true,
};

describe("EphemeralMessageBubble", () => {
  it("renders message text", () => {
    render(<EphemeralMessageBubble message={mockMessage} />);

    expect(screen.getByText("Reminder set for tomorrow at 9am")).toBeTruthy();
  });

  it("renders sender name", () => {
    render(<EphemeralMessageBubble message={mockMessage} />);

    expect(screen.getByText("Slaqbot")).toBeTruthy();
  });

  it("renders 'Only visible to you' label", () => {
    render(<EphemeralMessageBubble message={mockMessage} />);

    expect(screen.getByTestId("ephemeral-label")).toBeTruthy();
    expect(screen.getByText("Only visible to you")).toBeTruthy();
  });

  it("renders with correct testID", () => {
    render(<EphemeralMessageBubble message={mockMessage} />);

    expect(screen.getByTestId("ephemeral-message-eph-1")).toBeTruthy();
  });
});
