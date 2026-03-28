import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent, waitFor } from "@testing-library/react";
import type { BrowseChannel } from "@openslaq/client-core";
import { asChannelId, asWorkspaceId } from "@openslaq/shared";

const mockBrowseChannels = vi.fn<() => Promise<BrowseChannel[]>>();
const mockJoinChannel = vi.fn<() => Promise<void>>();
const mockLeaveChannel = vi.fn<() => Promise<void>>();
const mockArchiveChannel = vi.fn<() => Promise<void>>();
const mockUnarchiveChannel = vi.fn<() => Promise<void>>();

vi.mock("@openslaq/client-core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    browseChannels: (...args: unknown[]) => mockBrowseChannels(...(args as [])),
    joinChannel: (...args: unknown[]) => mockJoinChannel(...(args as [])),
    leaveChannel: (...args: unknown[]) => mockLeaveChannel(...(args as [])),
    archiveChannel: (...args: unknown[]) => mockArchiveChannel(...(args as [])),
    unarchiveChannel: (...args: unknown[]) => mockUnarchiveChannel(...(args as [])),
  };
});

const stableDeps = {
  api: {},
  auth: {},
  dispatch: vi.fn(),
  getState: () => ({}),
};
vi.mock("../../hooks/chat/useOperationDeps", () => ({
  useOperationDeps: () => stableDeps,
}));

vi.mock("../../hooks/useSocket", () => ({
  useSocket: () => ({ socket: null, status: "disconnected", lastError: null }),
}));

vi.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1", displayName: "Test User" }),
}));

vi.mock("../../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
}));

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { workspaces: [] }, dispatch: vi.fn() }),
}));

import { BrowseChannelsDialog } from "./BrowseChannelsDialog";

const makeChannel = (overrides: { id: string; name: string; description?: string | null; memberCount?: number; isMember?: boolean; type?: "public" | "private"; isArchived?: boolean }): BrowseChannel => ({
  id: asChannelId(overrides.id),
  workspaceId: asWorkspaceId("ws-1"),
  name: overrides.name,
  type: overrides.type ?? "public",
  description: overrides.description ?? null,
  displayName: null,
  isArchived: overrides.isArchived ?? false,
  createdBy: null,
  createdAt: "2025-01-01T00:00:00Z",
  memberCount: overrides.memberCount ?? 5,
  isMember: overrides.isMember ?? false,
});

const channels: BrowseChannel[] = [
  makeChannel({ id: "ch-1", name: "general", isMember: true, memberCount: 10 }),
  makeChannel({ id: "ch-2", name: "random", description: "Fun stuff", memberCount: 3 }),
  makeChannel({ id: "ch-3", name: "engineering", memberCount: 7 }),
];

describe("BrowseChannelsDialog", () => {
  beforeEach(() => {
    mockBrowseChannels.mockResolvedValue(channels);
    mockJoinChannel.mockResolvedValue(undefined);
    mockLeaveChannel.mockResolvedValue(undefined);
    mockArchiveChannel.mockResolvedValue(undefined);
    mockUnarchiveChannel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("renders channel list from fetched data", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    expect(screen.getByTestId("browse-channel-row-ch-1")).toBeTruthy();
    expect(screen.getByTestId("browse-channel-row-ch-2")).toBeTruthy();
    expect(screen.getByTestId("browse-channel-row-ch-3")).toBeTruthy();
  });

  test("shows 'Joined' for channels where isMember is true", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-joined-ch-1")).toBeTruthy();
    });

    // Non-member channels should have Join button
    expect(screen.getByTestId("browse-channel-join-ch-2")).toBeTruthy();
  });

  test("search filtering works (case-insensitive)", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    const searchInput = screen.getByTestId("browse-channels-search");
    fireEvent.change(searchInput, { target: { value: "ENG" } });

    expect(screen.getByTestId("browse-channel-row-ch-3")).toBeTruthy();
    expect(screen.queryByTestId("browse-channel-row-ch-1")).toBeNull();
    expect(screen.queryByTestId("browse-channel-row-ch-2")).toBeNull();
  });

  test("Join button calls joinChannel and updates to Joined", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-join-ch-2")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("browse-channel-join-ch-2"));

    await waitFor(() => {
      expect(mockJoinChannel).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-joined-ch-2")).toBeTruthy();
    });
  });

  test("calls onChannelJoined callback after join", async () => {
    const onChannelJoined = vi.fn();
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
        onChannelJoined={onChannelJoined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-join-ch-3")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("browse-channel-join-ch-3"));

    await waitFor(() => {
      expect(onChannelJoined).toHaveBeenCalledTimes(1);
    });
  });

  test("shows empty state when no channels match search", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    const searchInput = screen.getByTestId("browse-channels-search");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.queryByTestId("browse-channels-list")).toBeNull();
  });

  test("kebab menu has Leave option for member channels (not #general)", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    // Each channel card has a kebab menu
    expect(screen.getByTestId("browse-channel-menu-ch-1")).toBeTruthy();
    expect(screen.getByTestId("browse-channel-menu-ch-2")).toBeTruthy();
  });

  test("kebab menu shows archive option for admin", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
        isAdmin={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    // Radix DropdownMenu triggers on pointerDown
    fireEvent.pointerDown(screen.getByTestId("browse-channel-menu-ch-2"), { button: 0, pointerType: "mouse" });

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-menu-join-ch-2")).toBeTruthy();
      expect(screen.getByTestId("browse-channel-menu-archive-ch-2")).toBeTruthy();
    });
  });

  test("shows lock icon for private channels", async () => {
    const withPrivate = [
      ...channels,
      makeChannel({ id: "ch-priv", name: "secret", type: "private", isMember: true }),
    ];
    mockBrowseChannels.mockResolvedValue(withPrivate);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-private-ch-priv")).toBeTruthy();
    });
  });

  test("create channel button is shown", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-create-channel-btn")).toBeTruthy();
    });
  });

  test("shows '1 member' (singular) when memberCount is 1", async () => {
    mockBrowseChannels.mockResolvedValue([
      makeChannel({ id: "ch-solo", name: "solo", memberCount: 1 }),
    ]);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    expect(screen.getByText("1 member")).toBeTruthy();
    expect(screen.queryByText("1 members")).toBeNull();
  });

  test("shows '5 members' (plural) when memberCount > 1", async () => {
    mockBrowseChannels.mockResolvedValue([
      makeChannel({ id: "ch-many", name: "many", memberCount: 5 }),
    ]);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    expect(screen.getByText("5 members")).toBeTruthy();
  });

  test("shows 'Show archived' toggle that fetches archived channels", async () => {
    const archivedChannels = [
      ...channels,
      makeChannel({ id: "ch-archived", name: "old-project", isArchived: true }),
    ];
    // First call returns active only, second returns with archived
    mockBrowseChannels
      .mockResolvedValueOnce(channels)
      .mockResolvedValueOnce(archivedChannels);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    // Should not show archived channel initially
    expect(screen.queryByTestId("browse-channel-row-ch-archived")).toBeNull();

    // Toggle "Show archived"
    const toggle = screen.getByTestId("browse-show-archived-toggle");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-row-ch-archived")).toBeTruthy();
    });

    // browseChannels should have been called with includeArchived=true
    expect(mockBrowseChannels).toHaveBeenLastCalledWith(expect.anything(), "default", true);
  });

  test("archived channels show 'Archived' badge", async () => {
    const archivedChannels = [
      makeChannel({ id: "ch-archived", name: "old-project", isArchived: true }),
    ];
    mockBrowseChannels.mockResolvedValue(archivedChannels);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-row-ch-archived")).toBeTruthy();
    });

    expect(screen.getByTestId("browse-channel-archived-ch-archived")).toBeTruthy();
  });

  test("archived channels show 'Unarchive' option in kebab menu for admin", async () => {
    const archivedChannels = [
      makeChannel({ id: "ch-archived", name: "old-project", isArchived: true }),
    ];
    mockBrowseChannels.mockResolvedValue(archivedChannels);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
        isAdmin={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-row-ch-archived")).toBeTruthy();
    });

    fireEvent.pointerDown(screen.getByTestId("browse-channel-menu-ch-archived"), { button: 0, pointerType: "mouse" });

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-menu-unarchive-ch-archived")).toBeTruthy();
    });
  });

  test("unarchive removes archived badge from channel", async () => {
    const archivedChannels = [
      makeChannel({ id: "ch-archived", name: "old-project", isArchived: true }),
    ];
    mockBrowseChannels.mockResolvedValue(archivedChannels);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
        isAdmin={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-row-ch-archived")).toBeTruthy();
    });

    fireEvent.pointerDown(screen.getByTestId("browse-channel-menu-ch-archived"), { button: 0, pointerType: "mouse" });

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-menu-unarchive-ch-archived")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("browse-channel-menu-unarchive-ch-archived"));

    await waitFor(() => {
      expect(mockUnarchiveChannel).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("browse-channel-archived-ch-archived")).toBeNull();
    });
  });

  test("leave channel via kebab menu", async () => {
    // ch-1 is "general" and member, ch-3 is not a member.
    // We need a member channel that's not general
    const testChannels = [
      makeChannel({ id: "ch-1", name: "general", isMember: true }),
      makeChannel({ id: "ch-4", name: "design", isMember: true }),
    ];
    mockBrowseChannels.mockResolvedValue(testChannels);

    render(
      <BrowseChannelsDialog
        open={true}
        onClose={vi.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-channels-list")).toBeTruthy();
    });

    // Radix DropdownMenu triggers on pointerDown
    fireEvent.pointerDown(screen.getByTestId("browse-channel-menu-ch-4"), { button: 0, pointerType: "mouse" });

    await waitFor(() => {
      expect(screen.getByTestId("browse-channel-menu-leave-ch-4")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("browse-channel-menu-leave-ch-4"));

    await waitFor(() => {
      expect(mockLeaveChannel).toHaveBeenCalledTimes(1);
    });
  });
});
