import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

const mockListChannelMembers = vi.fn().mockResolvedValue([]);
const mockAddMembersBulk = vi.fn().mockResolvedValue({ added: 0 });
const mockRemoveMember = vi.fn().mockResolvedValue(undefined);
const mockListWorkspaceMembers = vi.fn().mockResolvedValue([]);

vi.mock("../../hooks/api/useChannelMembersApi", () => ({
  useChannelMembersApi: () => ({
    listChannelMembers: mockListChannelMembers,
    addMembersBulk: mockAddMembersBulk,
    removeMember: mockRemoveMember,
  }),
}));

vi.mock("../../hooks/api/useWorkspaceMembersApi", () => ({
  useWorkspaceMembersApi: () => ({
    listMembers: mockListWorkspaceMembers,
  }),
}));

import { ChannelMembersDialog } from "./ChannelMembersDialog";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  channelId: "ch-1",
  workspaceSlug: "default",
  presence: {},
  onOpenProfile: vi.fn(),
};

describe("ChannelMembersDialog", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockListChannelMembers.mockResolvedValue([]);
    mockListWorkspaceMembers.mockResolvedValue([]);
  });

  test("shows Add member button for public channels", async () => {
    render(<ChannelMembersDialog {...defaultProps} channelType="public" />);
    expect(screen.getByTestId("add-member-trigger")).toBeTruthy();
  });

  test("shows Add member button for private channels", async () => {
    render(<ChannelMembersDialog {...defaultProps} channelType="private" canManageMembers />);
    expect(screen.getByTestId("add-member-trigger")).toBeTruthy();
  });

  test("shows Add member button for private channels even without canManageMembers", async () => {
    render(<ChannelMembersDialog {...defaultProps} channelType="private" canManageMembers={false} />);
    expect(screen.getByTestId("add-member-trigger")).toBeTruthy();
  });

  test("does not show Remove button for public channel members", async () => {
    mockListChannelMembers.mockResolvedValue([
      { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, joinedAt: "2026-01-01" },
    ]);
    render(<ChannelMembersDialog {...defaultProps} channelType="public" canManageMembers channelCreatorId="u-other" />);
    // Wait for members to load
    await vi.waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    expect(screen.queryByTestId("remove-member-u-1")).toBeNull();
  });

  test("shows Remove button for private channel members when canManageMembers", async () => {
    mockListChannelMembers.mockResolvedValue([
      { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, joinedAt: "2026-01-01" },
    ]);
    render(<ChannelMembersDialog {...defaultProps} channelType="private" canManageMembers channelCreatorId="u-other" />);
    await vi.waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    expect(screen.getByTestId("remove-member-u-1")).toBeTruthy();
  });

  test("multi-select: selecting members shows bulk add button", async () => {
    mockListWorkspaceMembers.mockResolvedValue([
      { id: "u-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null },
      { id: "u-3", displayName: "Carol", email: "carol@test.com", avatarUrl: null },
    ]);
    render(<ChannelMembersDialog {...defaultProps} channelType="public" />);

    // Enter adding mode
    fireEvent.click(screen.getByTestId("add-member-trigger"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("select-member-u-2")).toBeTruthy();
    });

    // No bulk button initially
    expect(screen.queryByTestId("bulk-add-button")).toBeNull();

    // Select two members
    fireEvent.click(screen.getByTestId("select-member-u-2"));
    expect(screen.getByTestId("bulk-add-button")).toBeTruthy();
    expect(screen.getByTestId("bulk-add-button").textContent).toContain("1 member");

    fireEvent.click(screen.getByTestId("select-member-u-3"));
    expect(screen.getByTestId("bulk-add-button").textContent).toContain("2 members");
  });

  test("multi-select: deselecting member updates count", async () => {
    mockListWorkspaceMembers.mockResolvedValue([
      { id: "u-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null },
      { id: "u-3", displayName: "Carol", email: "carol@test.com", avatarUrl: null },
    ]);
    render(<ChannelMembersDialog {...defaultProps} channelType="public" />);

    fireEvent.click(screen.getByTestId("add-member-trigger"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("select-member-u-2")).toBeTruthy();
    });

    // Select both
    fireEvent.click(screen.getByTestId("select-member-u-2"));
    fireEvent.click(screen.getByTestId("select-member-u-3"));
    expect(screen.getByTestId("bulk-add-button").textContent).toContain("2 members");

    // Deselect one
    fireEvent.click(screen.getByTestId("select-member-u-2"));
    expect(screen.getByTestId("bulk-add-button").textContent).toContain("1 member");
  });

  test("multi-select: clicking bulk add button calls addMembersBulk", async () => {
    mockListWorkspaceMembers.mockResolvedValue([
      { id: "u-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null },
    ]);
    mockAddMembersBulk.mockResolvedValue({ added: 1 });
    render(<ChannelMembersDialog {...defaultProps} channelType="public" />);

    fireEvent.click(screen.getByTestId("add-member-trigger"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("select-member-u-2")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("select-member-u-2"));
    fireEvent.click(screen.getByTestId("bulk-add-button"));

    await vi.waitFor(() => {
      expect(mockAddMembersBulk).toHaveBeenCalledWith("default", "ch-1", ["u-2"]);
    });
  });

  test("addMembersBulk failure resets adding mode", async () => {
    mockListWorkspaceMembers.mockResolvedValue([
      { id: "u-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null },
    ]);
    mockAddMembersBulk.mockRejectedValue(new Error("Network error"));
    render(<ChannelMembersDialog {...defaultProps} channelType="public" />);

    fireEvent.click(screen.getByTestId("add-member-trigger"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("select-member-u-2")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("select-member-u-2"));
    fireEvent.click(screen.getByTestId("bulk-add-button"));

    // Should exit adding mode even on error
    await vi.waitFor(() => {
      expect(screen.queryByTestId("bulk-add-button")).toBeNull();
    });
  });

  test("removeMember failure keeps member in list", async () => {
    mockListChannelMembers.mockResolvedValue([
      { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, joinedAt: "2026-01-01" },
    ]);
    mockRemoveMember.mockRejectedValue(new Error("Network error"));
    render(<ChannelMembersDialog {...defaultProps} channelType="private" canManageMembers channelCreatorId="u-other" />);

    await vi.waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("remove-member-u-1"));

    // Member should still be visible after failed removal
    await vi.waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
  });
});
