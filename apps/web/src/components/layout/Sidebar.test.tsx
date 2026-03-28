import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "../../test-utils";
import { TooltipProvider } from "../ui";
import type { Channel, ChannelId, WorkspaceId } from "@openslaq/shared";
import type { WorkspaceInfo } from "../../state/chat-store";

// mock leakage into other test files (e.g. BrowseChannelsDialog.test.tsx).
vi.mock("react-router", () => ({
  useNavigate: () => () => {},
}));
vi.mock("../../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
}));
vi.mock("../channel/CreateChannelDialog", () => ({
  CreateChannelDialog: () => null,
}));
vi.mock("../channel/BrowseChannelsDialog", () => ({
  BrowseChannelsDialog: () => null,
}));
vi.mock("../dm/DmList", () => ({
  DmList: () => null,
}));
vi.mock("../user/CustomUserButton", () => ({
  CustomUserButton: () => null,
}));
vi.mock("../settings/WorkspaceSettingsDialog", () => ({
  WorkspaceSettingsDialog: () => null,
}));
vi.mock("../settings/InviteDialog", () => ({
  InviteDialog: () => null,
}));

import { Sidebar } from "./Sidebar";

const defaultProps = {
  activeChannelId: null,
  onSelectChannel: () => {},
  channels: [] as Channel[],
  activeDmId: null,
  onSelectDm: () => {},
  dms: [],
  groupDms: [],
  activeGroupDmId: null,
  onSelectGroupDm: () => {},
  currentUserId: "user-1",
  workspaceSlug: "default",
  workspaces: [{ id: "ws-1", slug: "default", name: "Test Workspace", role: "owner" as const, createdAt: "2026-01-01T00:00:00Z", memberCount: 1 }] as WorkspaceInfo[],
  unreadCounts: {},
  presence: {},
};

function makeChannel(id: string, name: string): Channel {
  return {
    id: id as ChannelId,
    workspaceId: "ws-1" as WorkspaceId,
    name,
    type: "public" as const,
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("Sidebar", () => {
  afterEach(cleanup);
  test("starred channels do not appear in the main Channels section", () => {
    const general = makeChannel("ch-1", "general");
    const random = makeChannel("ch-2", "random");
    const starred = makeChannel("ch-3", "starred-channel");

    render(
      <TooltipProvider>
        <Sidebar
          {...defaultProps}
          channels={[general, random, starred]}
          starredChannelIds={["ch-3"]}
        />
      </TooltipProvider>,
    );

    // The starred channel should appear in the Starred section
    const starredSection = screen.getByTestId("starred-section");
    expect(within(starredSection).getByTestId("starred-channel-ch-3")).toBeTruthy();

    // The main Channels section should NOT contain the starred channel
    const allButtons = screen.getAllByRole("button");
    const starredInChannelsList = allButtons.filter(
      (btn) => btn.textContent?.includes("starred-channel") && !starredSection.contains(btn),
    );
    expect(starredInChannelsList).toHaveLength(0);
  });

  test("non-starred channels still appear in the Channels section", () => {
    const general = makeChannel("ch-1", "general");
    const random = makeChannel("ch-2", "random");
    const starred = makeChannel("ch-3", "starred-channel");

    render(
      <TooltipProvider>
        <Sidebar
          {...defaultProps}
          channels={[general, random, starred]}
          starredChannelIds={["ch-3"]}
        />
      </TooltipProvider>,
    );

    // general and random should still be in the channel list
    const allButtons = screen.getAllByRole("button");
    const starredSection = screen.getByTestId("starred-section");

    const generalInChannels = allButtons.filter(
      (btn) => btn.textContent?.includes("# general") && !starredSection.contains(btn),
    );
    const randomInChannels = allButtons.filter(
      (btn) => btn.textContent?.includes("# random") && !starredSection.contains(btn),
    );

    expect(generalInChannels).toHaveLength(1);
    expect(randomInChannels).toHaveLength(1);
  });
});
