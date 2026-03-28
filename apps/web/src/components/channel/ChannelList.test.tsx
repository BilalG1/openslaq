import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import type { Channel, ChannelId } from "@openslaq/shared";
import { asChannelId, asWorkspaceId } from "@openslaq/shared";
import { ChannelList } from "./ChannelList";

afterEach(cleanup);

const makeChannel = (id: string, name: string, type: "public" | "private" = "public"): Channel => ({
  id: asChannelId(id),
  workspaceId: asWorkspaceId("ws-1"),
  name,
  type,
  description: null,
  displayName: null,
  isArchived: false,
  createdBy: null,
  createdAt: "2025-01-01T00:00:00Z",
}) as Channel;

const defaultProps = {
  activeChannelId: null,
  onSelectChannel: vi.fn(),
  collapsed: false,
  onToggleCollapsed: vi.fn(),
  unreadCounts: {} as Record<ChannelId, number>,
};

describe("ChannelList", () => {
  test("shows mentions-only icon for channels with mentions notification level", () => {
    const channels = [
      makeChannel("ch-1", "general"),
      makeChannel("ch-2", "random"),
    ];

    render(
      <ChannelList
        {...defaultProps}
        channels={channels}
        channelNotificationPrefs={{ [asChannelId("ch-2")]: "mentions" }}
      />,
    );

    // Should show mentions icon for ch-2
    expect(screen.getByTestId("mentions-icon-ch-2")).toBeTruthy();
    // Should NOT show mentions icon for ch-1 (default/all)
    expect(screen.queryByTestId("mentions-icon-ch-1")).toBeNull();
  });

  test("does not show mentions icon for muted or default channels", () => {
    const channels = [
      makeChannel("ch-1", "general"),
      makeChannel("ch-2", "random"),
      makeChannel("ch-3", "engineering"),
    ];

    render(
      <ChannelList
        {...defaultProps}
        channels={channels}
        channelNotificationPrefs={{
          [asChannelId("ch-1")]: "all",
          [asChannelId("ch-2")]: "muted",
        }}
      />,
    );

    expect(screen.queryByTestId("mentions-icon-ch-1")).toBeNull();
    expect(screen.queryByTestId("mentions-icon-ch-2")).toBeNull();
    expect(screen.queryByTestId("mentions-icon-ch-3")).toBeNull();
  });
});
