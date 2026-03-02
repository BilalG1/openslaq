import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MemberRow } from "../workspace/MemberRow";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        borderDefault: "#ddd",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

const defaultProps = {
  id: "u-1",
  displayName: "Alice Smith",
  email: "alice@example.com",
  avatarUrl: null,
  role: "member",
  isCurrentUser: false,
  canChangeRole: false,
  canRemove: false,
  onChangeRole: jest.fn(),
  onRemove: jest.fn(),
};

describe("MemberRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders member info", () => {
    render(<MemberRow {...defaultProps} />);

    expect(screen.getByTestId("member-row-u-1")).toBeTruthy();
    expect(screen.getByText("Alice Smith")).toBeTruthy();
    expect(screen.getByText("alice@example.com")).toBeTruthy();
    expect(screen.getByText("member")).toBeTruthy();
  });

  it("shows initials when no avatar", () => {
    render(<MemberRow {...defaultProps} />);

    expect(screen.getByText("AS")).toBeTruthy();
  });

  it("shows (you) for current user", () => {
    render(<MemberRow {...defaultProps} isCurrentUser={true} />);

    expect(screen.getByText(" (you)")).toBeTruthy();
  });

  it("shows role toggle when canChangeRole", () => {
    const onChangeRole = jest.fn();
    render(
      <MemberRow {...defaultProps} canChangeRole={true} onChangeRole={onChangeRole} />,
    );

    const btn = screen.getByTestId("role-toggle-u-1");
    expect(btn).toBeTruthy();
    expect(screen.getByText("Promote")).toBeTruthy();

    fireEvent.press(btn);
    expect(onChangeRole).toHaveBeenCalledWith("u-1", "admin");
  });

  it("shows Demote for admin", () => {
    const onChangeRole = jest.fn();
    render(
      <MemberRow {...defaultProps} role="admin" canChangeRole={true} onChangeRole={onChangeRole} />,
    );

    expect(screen.getByText("Demote")).toBeTruthy();
    fireEvent.press(screen.getByTestId("role-toggle-u-1"));
    expect(onChangeRole).toHaveBeenCalledWith("u-1", "member");
  });

  it("shows remove button when canRemove", () => {
    const onRemove = jest.fn();
    render(<MemberRow {...defaultProps} canRemove={true} onRemove={onRemove} />);

    const btn = screen.getByTestId("remove-member-u-1");
    expect(btn).toBeTruthy();

    fireEvent.press(btn);
    expect(onRemove).toHaveBeenCalledWith("u-1", "Alice Smith");
  });

  it("hides action buttons when not permitted", () => {
    render(<MemberRow {...defaultProps} />);

    expect(screen.queryByTestId("role-toggle-u-1")).toBeNull();
    expect(screen.queryByTestId("remove-member-u-1")).toBeNull();
  });
});
