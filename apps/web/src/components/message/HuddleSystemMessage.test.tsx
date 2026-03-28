import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import { HuddleSystemMessage } from "./HuddleSystemMessage";
import type { HuddleMessage, HuddleState, ChannelId, MessageId, UserId } from "@openslaq/shared";

function makeHuddleMessage(overrides?: Partial<HuddleMessage>): HuddleMessage {
  return {
    id: "msg-1" as MessageId,
    channelId: "ch-1" as ChannelId,
    userId: "user-1" as UserId,
    content: "",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
    type: "huddle",
    attachments: [],
    reactions: [],
    replyCount: 0,
    isPinned: false,
    isEdited: false,
    parentMessageId: null,
    latestReplyAt: null,
    mentions: [],
    metadata: undefined,
    senderDisplayName: undefined,
    ...overrides,
  } as unknown as HuddleMessage;
}

function makeActiveHuddle(participants: string[]): HuddleState {
  return {
    channelId: "ch-1" as ChannelId,
    participants: participants.map((userId) => ({
      userId: userId as UserId,
      isMuted: false,
    })),
    startedAt: "2026-03-01T10:00:00Z",
    startedBy: "user-1" as UserId,
  } as unknown as HuddleState;
}

describe("HuddleSystemMessage", () => {
  afterEach(cleanup);

  test("inactive huddle with metadata shows duration and participant count", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({
          metadata: {
            huddleEndedAt: "2026-03-01T10:30:00Z",
            duration: 1800,
            finalParticipants: ["user-1", "user-2"],
          } as HuddleMessage["metadata"],
        })}
      />,
    );

    expect(screen.getByText("Lasted 30 min")).toBeTruthy();
  });

  test("inactive huddle without metadata shows minimal text", () => {
    render(<HuddleSystemMessage message={makeHuddleMessage()} />);
    expect(screen.getByText(/started a huddle/)).toBeTruthy();
    expect(screen.queryByText(/Lasted/)).toBeNull();
  });

  test("active huddle shows participant avatars and join button", () => {
    const onJoin = vi.fn();
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage()}
        activeHuddle={makeActiveHuddle(["user-1", "user-2"])}
        onJoinHuddle={onJoin}
      />,
    );

    expect(screen.getByText("2 participants")).toBeTruthy();
    expect(screen.getByTestId("huddle-join-from-message")).toBeTruthy();
  });

  test("join button calls onJoinHuddle with channelId", () => {
    const onJoin = vi.fn();
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage()}
        activeHuddle={makeActiveHuddle(["user-1"])}
        onJoinHuddle={onJoin}
      />,
    );

    fireEvent.click(screen.getByTestId("huddle-join-from-message"));
    expect(onJoin).toHaveBeenCalledWith("ch-1");
  });

  test("no onJoinHuddle → no Join button rendered", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage()}
        activeHuddle={makeActiveHuddle(["user-1"])}
      />,
    );

    expect(screen.queryByTestId("huddle-join-from-message")).toBeNull();
  });

  test("display name uses senderDisplayName, falls back to userId", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({ senderDisplayName: "Alice" })}
      />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();

    cleanup();

    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({ senderDisplayName: undefined })}
      />,
    );
    expect(screen.getByText("user-1")).toBeTruthy();
  });

  test("formatDuration: <60s shows seconds", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({
          metadata: { huddleEndedAt: "2026-03-01T10:00:42Z", duration: 42 } as HuddleMessage["metadata"],
        })}
      />,
    );
    expect(screen.getByText("Lasted 42s")).toBeTruthy();
  });

  test("formatDuration: ≥3600s shows hours and minutes", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({
          metadata: { huddleEndedAt: "2026-03-01T11:30:00Z", duration: 5400 } as HuddleMessage["metadata"],
        })}
      />,
    );
    expect(screen.getByText("Lasted 1h 30m")).toBeTruthy();
  });

  test("formatDuration: exact hours shows without minutes", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({
          metadata: { huddleEndedAt: "2026-03-01T12:00:00Z", duration: 7200 } as HuddleMessage["metadata"],
        })}
      />,
    );
    expect(screen.getByText("Lasted 2h")).toBeTruthy();
  });

  test("ended huddle message shows as ended even when a different huddle is active on same channel", () => {
    const activeHuddle = {
      ...makeActiveHuddle(["user-3"]),
      messageId: "msg-active",
    };
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage({
          id: "msg-ended" as MessageId,
          metadata: {
            huddleStartedAt: "2026-03-01T09:00:00Z",
            huddleEndedAt: "2026-03-01T09:30:00Z",
            duration: 1800,
            finalParticipants: ["user-1", "user-2"],
          } as HuddleMessage["metadata"],
        })}
        activeHuddle={activeHuddle}
        onJoinHuddle={vi.fn()}
      />,
    );

    // Should show ended state, not active state
    expect(screen.getByText("Lasted 30 min")).toBeTruthy();
    expect(screen.queryByTestId("huddle-join-from-message")).toBeNull();
  });

  test("1 participant shows singular form", () => {
    render(
      <HuddleSystemMessage
        message={makeHuddleMessage()}
        activeHuddle={makeActiveHuddle(["user-1"])}
        onJoinHuddle={vi.fn()}
      />,
    );
    expect(screen.getByText("1 participant")).toBeTruthy();
  });
});
