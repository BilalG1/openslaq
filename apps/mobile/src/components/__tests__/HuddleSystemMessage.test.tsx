import React from "react";
import { render, screen } from "@testing-library/react-native";
import type { HuddleMessage, ChannelId, MessageId, UserId } from "@openslaq/shared";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        textFaint: "#999",
        huddleActiveBg: "#d1fae5",
        huddleActiveText: "#065f46",
        surfaceTertiary: "#eee",
      },
    },
  }),
}));

import { HuddleSystemMessage } from "../HuddleSystemMessage";

function makeMessage(overrides: Partial<HuddleMessage> = {}): HuddleMessage {
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
    type: "huddle",
    metadata: { huddleStartedAt: "2026-03-17T12:00:00Z" },
    ...overrides,
  } as HuddleMessage;
}

describe("HuddleSystemMessage", () => {
  it("renders with testID", () => {
    render(<HuddleSystemMessage message={makeMessage()} />);
    expect(screen.getByTestId("huddle-system-message")).toBeTruthy();
  });

  it('shows "started a huddle" text', () => {
    render(<HuddleSystemMessage message={makeMessage()} />);
    expect(screen.getByText(/started a huddle/)).toBeTruthy();
  });

  it("shows sender display name", () => {
    render(
      <HuddleSystemMessage
        message={makeMessage({ senderDisplayName: "Alice" })}
      />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("falls back to userId when senderDisplayName is undefined", () => {
    render(
      <HuddleSystemMessage
        message={makeMessage({ senderDisplayName: undefined, userId: "user-456" as unknown as UserId })}
      />,
    );
    expect(screen.getByText("user-456")).toBeTruthy();
  });

  it("returns null when metadata is falsy", () => {
    const msg = makeMessage();
    (msg as unknown as Record<string, unknown>).metadata = null;
    const { toJSON } = render(<HuddleSystemMessage message={msg as unknown as HuddleMessage} />);
    expect(toJSON()).toBeNull();
  });

  it("does not show duration for active huddle", () => {
    render(<HuddleSystemMessage message={makeMessage()} />);
    expect(screen.queryByText(/Lasted/)).toBeNull();
  });

  it("shows duration for ended huddle in seconds", () => {
    render(
      <HuddleSystemMessage
        message={makeMessage({
          metadata: { huddleStartedAt: "2026-03-17T12:00:00Z", huddleEndedAt: "2026-03-17T12:05:00Z", duration: 45 },
        })}
      />,
    );
    expect(screen.getByText("Lasted 45s")).toBeTruthy();
  });

  it("shows duration for ended huddle in minutes", () => {
    render(
      <HuddleSystemMessage
        message={makeMessage({
          metadata: { huddleStartedAt: "2026-03-17T12:00:00Z", huddleEndedAt: "2026-03-17T12:05:00Z", duration: 125 },
        })}
      />,
    );
    expect(screen.getByText("Lasted 2 min")).toBeTruthy();
  });

  it("shows duration for ended huddle in hours and minutes", () => {
    render(
      <HuddleSystemMessage
        message={makeMessage({
          metadata: { huddleStartedAt: "2026-03-17T12:00:00Z", huddleEndedAt: "2026-03-17T13:31:00Z", duration: 3660 },
        })}
      />,
    );
    expect(screen.getByText("Lasted 1h 1m")).toBeTruthy();
  });

  it("shows duration for exact hours without minutes", () => {
    render(
      <HuddleSystemMessage
        message={makeMessage({
          metadata: { huddleStartedAt: "2026-03-17T12:00:00Z", huddleEndedAt: "2026-03-17T14:00:00Z", duration: 7200 },
        })}
      />,
    );
    expect(screen.getByText("Lasted 2h")).toBeTruthy();
  });
});
