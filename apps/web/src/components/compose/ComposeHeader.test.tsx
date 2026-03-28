import { describe, expect, test, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import { ComposeHeader, type ComposeRecipient } from "./ComposeHeader";
import type { Channel } from "@openslaq/shared";
import { asChannelId, asUserId, asWorkspaceId } from "@openslaq/shared";

afterEach(cleanup);

function makeChannel(id: string, name: string): Channel {
  return {
    id: asChannelId(id),
    workspaceId: asWorkspaceId("ws-1"),
    name,
    type: "public",
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: asUserId("user-1"),
    createdAt: new Date().toISOString(),
  };
}

const members = [
  { id: "u-alice", displayName: "Alice", email: "alice@test.com", avatarUrl: null },
  { id: "u-bob", displayName: "Bob", email: "bob@test.com", avatarUrl: null },
  { id: "u-charlie", displayName: "Charlie", email: "charlie@test.com", avatarUrl: null },
];

const channels = [
  makeChannel("ch-general", "general"),
  makeChannel("ch-random", "random"),
];

const defaultProps = {
  selectedUsers: [] as ComposeRecipient[],
  onAddUser: vi.fn(),
  onRemoveUser: vi.fn(),
  onSelectChannel: vi.fn(),
  members,
  channels,
  currentUserId: "u-me",
  presence: {},
};

describe("ComposeHeader", () => {
  test("renders To: input", () => {
    render(<ComposeHeader {...defaultProps} />);
    expect(screen.getByTestId("compose-to-input")).toBeTruthy();
    expect(screen.getByText("To:")).toBeTruthy();
  });

  test("filters people on type", () => {
    render(<ComposeHeader {...defaultProps} />);
    const input = screen.getByTestId("compose-to-input");
    fireEvent.change(input, { target: { value: "ali" } });
    expect(screen.getByTestId("compose-dropdown")).toBeTruthy();
    expect(screen.getByTestId("compose-option-person-u-alice")).toBeTruthy();
    expect(screen.queryByTestId("compose-option-person-u-bob")).toBeNull();
  });

  test("filters channels on type", () => {
    render(<ComposeHeader {...defaultProps} />);
    const input = screen.getByTestId("compose-to-input");
    fireEvent.change(input, { target: { value: "gen" } });
    expect(screen.getByTestId("compose-option-channel-ch-general")).toBeTruthy();
    expect(screen.queryByTestId("compose-option-channel-ch-random")).toBeNull();
  });

  test("clicking a person calls onAddUser", () => {
    const onAddUser = vi.fn();
    render(<ComposeHeader {...defaultProps} onAddUser={onAddUser} />);
    const input = screen.getByTestId("compose-to-input");
    fireEvent.change(input, { target: { value: "bob" } });
    fireEvent.click(screen.getByTestId("compose-option-person-u-bob"));
    expect(onAddUser).toHaveBeenCalledWith({ id: "u-bob", displayName: "Bob", avatarUrl: null });
  });

  test("clicking a channel calls onSelectChannel", () => {
    const onSelectChannel = vi.fn();
    render(<ComposeHeader {...defaultProps} onSelectChannel={onSelectChannel} />);
    const input = screen.getByTestId("compose-to-input");
    fireEvent.change(input, { target: { value: "random" } });
    fireEvent.click(screen.getByTestId("compose-option-channel-ch-random"));
    expect(onSelectChannel).toHaveBeenCalledWith(String(asChannelId("ch-random")));
  });

  test("renders chips and remove button works", () => {
    const onRemoveUser = vi.fn();
    const selected: ComposeRecipient[] = [
      { id: "u-alice", displayName: "Alice", avatarUrl: null },
    ];
    render(<ComposeHeader {...defaultProps} selectedUsers={selected} onRemoveUser={onRemoveUser} />);
    expect(screen.getByTestId("compose-chip-u-alice")).toBeTruthy();
    fireEvent.click(screen.getByTestId("compose-chip-remove-u-alice"));
    expect(onRemoveUser).toHaveBeenCalledWith("u-alice");
  });

  test("excludes already-selected users from dropdown", () => {
    const selected: ComposeRecipient[] = [
      { id: "u-alice", displayName: "Alice", avatarUrl: null },
    ];
    render(<ComposeHeader {...defaultProps} selectedUsers={selected} />);
    const input = screen.getByTestId("compose-to-input");
    fireEvent.change(input, { target: { value: "a" } });
    // Alice should not appear
    expect(screen.queryByTestId("compose-option-person-u-alice")).toBeNull();
  });

  test("excludes current user from dropdown", () => {
    const membersWithMe = [
      ...members,
      { id: "u-me", displayName: "Me", email: "me@test.com", avatarUrl: null },
    ];
    render(<ComposeHeader {...defaultProps} members={membersWithMe} />);
    const input = screen.getByTestId("compose-to-input");
    fireEvent.change(input, { target: { value: "me" } });
    expect(screen.queryByTestId("compose-option-person-u-me")).toBeNull();
  });
});
