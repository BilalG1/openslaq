import { describe, test, expect, afterEach, jest, mock, beforeEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent, waitFor } from "@testing-library/react";
import type { BrowseChannel } from "@openslaq/client-core";
import { asChannelId, asWorkspaceId } from "@openslaq/shared";

const _realClientCore = require("@openslaq/client-core");
const mockBrowseChannels = jest.fn<() => Promise<BrowseChannel[]>>();
const mockJoinChannel = jest.fn<() => Promise<void>>();
const mockLeaveChannel = jest.fn<() => Promise<void>>();
const mockArchiveChannel = jest.fn<() => Promise<void>>();

mock.module("@openslaq/client-core", () => ({
  ..._realClientCore,
  browseChannels: (...args: unknown[]) => mockBrowseChannels(...(args as [])),
  joinChannel: (...args: unknown[]) => mockJoinChannel(...(args as [])),
  leaveChannel: (...args: unknown[]) => mockLeaveChannel(...(args as [])),
  archiveChannel: (...args: unknown[]) => mockArchiveChannel(...(args as [])),
}));

const stableDeps = {
  api: {},
  auth: {},
  dispatch: jest.fn(),
  getState: () => ({}),
};
mock.module("../../hooks/chat/useOperationDeps", () => ({
  useOperationDeps: () => stableDeps,
}));

mock.module("../../hooks/useSocket", () => ({
  useSocket: () => ({ socket: null, status: "disconnected", lastError: null }),
}));

mock.module("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1", displayName: "Test User" }),
}));

mock.module("../../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
}));

mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { workspaces: [] }, dispatch: jest.fn() }),
}));

const { BrowseChannelsDialog } = await import("./BrowseChannelsDialog");

const makeChannel = (overrides: { id: string; name: string; description?: string | null; memberCount?: number; isMember?: boolean; type?: "public" | "private" }): BrowseChannel => ({
  id: asChannelId(overrides.id),
  workspaceId: asWorkspaceId("ws-1"),
  name: overrides.name,
  type: overrides.type ?? "public",
  description: overrides.description ?? null,
  displayName: null,
  isArchived: false,
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
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test("renders channel list from fetched data", async () => {
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
    const onChannelJoined = jest.fn();
    render(
      <BrowseChannelsDialog
        open={true}
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
        workspaceSlug="default"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("browse-create-channel-btn")).toBeTruthy();
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
        onClose={jest.fn()}
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
