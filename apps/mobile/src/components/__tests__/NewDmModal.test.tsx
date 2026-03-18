import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { NewDmModal } from "../NewDmModal";
import * as clientCore from "@openslaq/client-core";

jest.mock("@openslaq/client-core", () => ({
  listWorkspaceMembers: jest.fn(),
  createDm: jest.fn(),
  createGroupDm: jest.fn(),
  getErrorMessage: jest.fn((err, fallback) =>
    err instanceof Error ? err.message : fallback,
  ),
}));

const mockListMembers = clientCore.listWorkspaceMembers as jest.MockedFunction<
  typeof clientCore.listWorkspaceMembers
>;
const mockCreateDm = clientCore.createDm as jest.MockedFunction<
  typeof clientCore.createDm
>;
const mockCreateGroupDm = clientCore.createGroupDm as jest.MockedFunction<
  typeof clientCore.createGroupDm
>;

const mockDeps = {
  api: {} as any,
  auth: { onAuthRequired: jest.fn() } as any,
  dispatch: jest.fn(),
  getState: jest.fn(),
};

const members: clientCore.WorkspaceMember[] = [
  { id: "user-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, role: "member", createdAt: "2026-01-01T00:00:00.000Z", joinedAt: "2026-01-15T00:00:00.000Z" },
  { id: "user-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null, role: "member", createdAt: "2026-01-01T00:00:00.000Z", joinedAt: "2026-01-15T00:00:00.000Z" },
  { id: "user-3", displayName: "Carol", email: "carol@test.com", avatarUrl: null, role: "member", createdAt: "2026-01-01T00:00:00.000Z", joinedAt: "2026-01-15T00:00:00.000Z" },
  { id: "current", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "admin", createdAt: "2026-01-01T00:00:00.000Z", joinedAt: "2026-01-15T00:00:00.000Z" },
];

function renderModal(overrides = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
    workspaceSlug: "test-ws",
    currentUserId: "current",
    deps: mockDeps,
    ...overrides,
  };
  return { ...render(<NewDmModal {...defaultProps} />), props: defaultProps };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListMembers.mockResolvedValue(members);
});

describe("NewDmModal", () => {
  it("renders member list when visible", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("filters out current user from member list", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    expect(screen.queryByText("Me")).toBeNull();
  });

  it("filters members by search text", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("new-dm-filter"), "alice");

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("filters members by email", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("new-dm-filter"), "bob@");

    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.queryByText("Alice")).toBeNull();
  });

  it("shows loading state while fetching members", async () => {
    let resolveMembers!: (value: clientCore.WorkspaceMember[]) => void;
    mockListMembers.mockReturnValue(
      new Promise((resolve) => { resolveMembers = resolve; }),
    );

    renderModal();

    expect(screen.getByTestId("new-dm-loading")).toBeTruthy();

    await act(async () => resolveMembers(members));

    expect(screen.queryByTestId("new-dm-loading")).toBeNull();
  });

  it("shows error state on fetch failure", async () => {
    mockListMembers.mockRejectedValue(new Error("Network error"));

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-error")).toBeTruthy();
    });

    expect(screen.getByText("Network error")).toBeTruthy();
  });

  it("shows chips when members are selected", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));

    expect(screen.getByTestId("selected-chips")).toBeTruthy();
    expect(screen.getByTestId("selected-chip-user-1")).toBeTruthy();
  });

  it("removes chip when tapped", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    // Select Alice
    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    expect(screen.getByTestId("selected-chip-user-1")).toBeTruthy();

    // Tap chip to deselect
    fireEvent.press(screen.getByTestId("selected-chip-user-1"));
    expect(screen.queryByTestId("selected-chip-user-1")).toBeNull();
    expect(screen.queryByTestId("selected-chips")).toBeNull();
  });

  it("shows Go button for single selection", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));

    expect(screen.getByTestId("new-dm-go-button")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
  });

  it("shows Start Group DM button for multiple selections", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    fireEvent.press(screen.getByTestId("new-dm-member-user-2"));

    expect(screen.getByTestId("new-dm-go-button")).toBeTruthy();
    expect(screen.getByText("Start Group DM (2 people)")).toBeTruthy();
  });

  it("calls createDm when Go pressed with 1 selected", async () => {
    mockCreateDm.mockResolvedValue({
      channel: { id: "dm-ch-1" },
      otherUser: { id: "user-1", displayName: "Alice" },
    } as any);

    const { props } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-go-button"));
    });

    expect(mockCreateDm).toHaveBeenCalledWith(mockDeps, {
      workspaceSlug: "test-ws",
      targetUserId: "user-1",
    });
    expect(props.onCreated).toHaveBeenCalledWith("dm-ch-1");
  });

  it("calls createGroupDm when Go pressed with 2+ selected", async () => {
    mockCreateGroupDm.mockResolvedValue({
      channel: { id: "gdm-ch-1" },
      members: [
        { id: "user-1", displayName: "Alice", avatarUrl: null },
        { id: "user-2", displayName: "Bob", avatarUrl: null },
      ],
    } as any);

    const { props } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    fireEvent.press(screen.getByTestId("new-dm-member-user-2"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-go-button"));
    });

    expect(mockCreateGroupDm).toHaveBeenCalledWith(mockDeps, {
      workspaceSlug: "test-ws",
      memberIds: ["user-1", "user-2"],
    });
    expect(mockCreateDm).not.toHaveBeenCalled();
    expect(props.onCreated).toHaveBeenCalledWith("gdm-ch-1");
  });

  it("shows creating state during DM creation", async () => {
    let resolveCreate!: (value: any) => void;
    mockCreateDm.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-go-button"));
    });

    expect(screen.getByTestId("new-dm-creating")).toBeTruthy();

    await act(async () =>
      resolveCreate({
        channel: { id: "dm-ch-1" },
        otherUser: { id: "user-1", displayName: "Alice" },
      }),
    );

    expect(screen.queryByTestId("new-dm-creating")).toBeNull();
  });

  it("calls onClose on backdrop tap", async () => {
    const { props } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-modal-backdrop"));

    expect(props.onClose).toHaveBeenCalled();
  });

  it("resets selected members on close", async () => {
    const { props, rerender } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    // Select a member
    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    expect(screen.getByTestId("selected-chips")).toBeTruthy();

    // Close
    fireEvent.press(screen.getByTestId("new-dm-modal-backdrop"));

    // Re-open
    rerender(<NewDmModal {...{ ...props, visible: true }} />);

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    expect(screen.queryByTestId("selected-chips")).toBeNull();
  });

  it("shows error when createDm returns null", async () => {
    mockCreateDm.mockResolvedValue(null);

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-member-user-1"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-go-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-error")).toBeTruthy();
    });
  });
});
