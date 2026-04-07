import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { HuddleHeaderButton } from "./HuddleHeaderButton";
import type { HuddleState, ChannelId, UserId } from "@openslaq/shared";

function makeActiveHuddle(channelId = "ch-1"): HuddleState {
  return {
    channelId: channelId as ChannelId,
    participants: [
      { userId: "user-1" as UserId, isMuted: false, isCameraOn: false, isScreenSharing: false, joinedAt: "2026-03-01T10:00:00Z" },
    ],
    startedAt: "2026-03-01T10:00:00Z",
    livekitRoom: null,
    screenShareUserId: null,
    messageId: null,
  };
}

describe("HuddleHeaderButton", () => {
  afterEach(cleanup);

  test("clicking start button shows confirmation dialog", async () => {
    const onStart = vi.fn();
    render(
      <TooltipProvider>
        <HuddleHeaderButton
          channelId="ch-1"
          activeHuddle={null}
          currentHuddleChannelId={null}
          onStart={onStart}
          onJoin={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId("huddle-start-button"));

    // Dialog should appear
    expect(screen.getByText("Start a huddle?")).toBeTruthy();
    expect(screen.getByText("This will start a live audio huddle in this channel.")).toBeTruthy();
    // onStart should NOT have been called yet
    expect(onStart).not.toHaveBeenCalled();
  });

  test("confirming dialog calls onStart", async () => {
    const onStart = vi.fn();
    render(
      <TooltipProvider>
        <HuddleHeaderButton
          channelId="ch-1"
          activeHuddle={null}
          currentHuddleChannelId={null}
          onStart={onStart}
          onJoin={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId("huddle-start-button"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => expect(onStart).toHaveBeenCalledOnce());
  });

  test("cancelling dialog does not call onStart", async () => {
    const onStart = vi.fn();
    render(
      <TooltipProvider>
        <HuddleHeaderButton
          channelId="ch-1"
          activeHuddle={null}
          currentHuddleChannelId={null}
          onStart={onStart}
          onJoin={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId("huddle-start-button"));
    fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));

    expect(onStart).not.toHaveBeenCalled();
  });

  test("shows 'In huddle' when user is in this huddle", () => {
    render(
      <HuddleHeaderButton
        channelId="ch-1"
        activeHuddle={makeActiveHuddle()}
        currentHuddleChannelId="ch-1"
        onStart={vi.fn()}
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByTestId("huddle-in-progress")).toBeTruthy();
    expect(screen.getByText("In huddle")).toBeTruthy();
  });

  test("shows Join button when huddle is active but user is not in it", () => {
    const onJoin = vi.fn();
    render(
      <HuddleHeaderButton
        channelId="ch-1"
        activeHuddle={makeActiveHuddle()}
        currentHuddleChannelId={null}
        onStart={vi.fn()}
        onJoin={onJoin}
      />,
    );

    const joinBtn = screen.getByTestId("huddle-join-button");
    expect(joinBtn.textContent).toContain("Join (1)");
    fireEvent.click(joinBtn);
    expect(onJoin).toHaveBeenCalledOnce();
  });

  test("start button shows error alert when already in another huddle", async () => {
    const onStart = vi.fn();
    render(
      <TooltipProvider>
        <HuddleHeaderButton
          channelId="ch-1"
          activeHuddle={null}
          currentHuddleChannelId="ch-other"
          onStart={onStart}
          onJoin={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId("huddle-start-button"));

    // Should show error alert, not the confirm dialog
    expect(screen.getByText("Already in a huddle")).toBeTruthy();
    expect(screen.queryByText("Start a huddle?")).toBeNull();
    expect(onStart).not.toHaveBeenCalled();
  });

  test("join button shows error alert when already in another huddle", () => {
    const onJoin = vi.fn();
    render(
      <HuddleHeaderButton
        channelId="ch-1"
        activeHuddle={makeActiveHuddle()}
        currentHuddleChannelId="ch-other"
        onStart={vi.fn()}
        onJoin={onJoin}
      />,
    );

    fireEvent.click(screen.getByTestId("huddle-join-button"));

    expect(screen.getByText("Already in a huddle")).toBeTruthy();
    expect(onJoin).not.toHaveBeenCalled();
  });
});
