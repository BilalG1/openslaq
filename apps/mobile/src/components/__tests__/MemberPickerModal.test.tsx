import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { MemberPickerModal } from "../search/MemberPickerModal";
import * as clientCore from "@openslaq/client-core";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
        dangerText: "#d00",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

jest.mock("@openslaq/client-core", () => ({
  listWorkspaceMembers: jest.fn(),
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

jest.mock("@/lib/api", () => ({
  api: { __api: "mock" },
}));

const mockAuthProvider = { onAuthRequired: jest.fn() };
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: mockAuthProvider,
  }),
}));

const mockListMembers = clientCore.listWorkspaceMembers as jest.Mock;

const members = [
  { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, role: "member", createdAt: "2026-01-01T00:00:00Z", joinedAt: "2026-01-15T00:00:00Z" },
  { id: "u-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null, role: "member", createdAt: "2026-01-01T00:00:00Z", joinedAt: "2026-01-15T00:00:00Z" },
];

function renderModal(overrides = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    workspaceSlug: "test-ws",
    ...overrides,
  };
  return { ...render(<MemberPickerModal {...defaultProps} />), props: defaultProps };
}

describe("MemberPickerModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMembers.mockResolvedValue(members);
  });

  it("loads members on mount when visible=true", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("member-picker-list")).toBeTruthy();
    });

    expect(mockListMembers).toHaveBeenCalled();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows loading indicator during fetch", async () => {
    let resolveMembers!: (value: any) => void;
    mockListMembers.mockReturnValue(new Promise((r) => { resolveMembers = r; }));

    renderModal();

    expect(screen.getByTestId("member-picker-loading")).toBeTruthy();

    await act(async () => resolveMembers(members));

    expect(screen.queryByTestId("member-picker-loading")).toBeNull();
  });

  it("renders member list after load resolves", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("member-picker-list")).toBeTruthy();
    });

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("filters members by displayName on text input", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("member-picker-list")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("member-picker-filter"), "ali");

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("shows error when load fails", async () => {
    mockListMembers.mockRejectedValue(new Error("Network error"));

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("member-picker-error")).toBeTruthy();
    });

    expect(screen.getByText("Failed to load members")).toBeTruthy();
  });

  it("handleSelect calls onSelect and closes", async () => {
    const { props } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("member-picker-item-u-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("member-picker-item-u-1"));

    expect(props.onSelect).toHaveBeenCalledWith("u-1", "Alice");
  });

  it("does NOT fetch when visible=false", () => {
    renderModal({ visible: false });

    expect(mockListMembers).not.toHaveBeenCalled();
  });
});
