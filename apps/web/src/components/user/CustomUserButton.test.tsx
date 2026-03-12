import { describe, test, expect, afterEach, jest, mock } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

const mockUser = {
  id: "user-1",
  displayName: "Test User",
  primaryEmail: "test@example.com",
  profileImageUrl: "https://example.com/avatar.png",
};

mock.module("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

const mockRedirectToAuth = jest.fn(async () => {});
mock.module("../../lib/auth", () => ({
  redirectToAuth: mockRedirectToAuth,
}));

const mockCycle = jest.fn();
mock.module("../../theme/ThemeProvider", () => ({
  useTheme: () => ({ mode: "light", resolved: "light", setMode: () => {}, cycle: mockCycle }),
}));

mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { presence: {} } }),
}));

mock.module("../settings/UserSettingsDialog", () => ({
  UserSettingsDialog: () => null,
}));

mock.module("./SetStatusDialog", () => ({
  SetStatusDialog: () => null,
}));

const { CustomUserButton } = await import("./CustomUserButton");

/** Radix DropdownMenu needs pointerdown to open */
function openDropdown(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.click(trigger);
}

describe("CustomUserButton", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test("renders avatar image", () => {
    render(<CustomUserButton />);
    const img = screen.getByAltText("Test User");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.png");
  });

  test("shows display name when showUserInfo is true", () => {
    render(<CustomUserButton showUserInfo />);
    expect(screen.getByText("Test User")).toBeDefined();
  });

  test("does not show display name when showUserInfo is false", () => {
    render(<CustomUserButton />);
    expect(screen.queryByText("Test User")).toBeNull();
  });

  test("opens dropdown with menu items on click", async () => {
    render(<CustomUserButton />);
    await act(() => openDropdown(screen.getByRole("button")));

    expect(screen.getByText("Set a status")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
    expect(screen.getByText("Theme: Light")).toBeDefined();
    expect(screen.getByText("Sign out")).toBeDefined();
  });

  test("calls cycle when theme item is clicked", async () => {
    render(<CustomUserButton />);
    await act(() => openDropdown(screen.getByRole("button")));
    fireEvent.click(screen.getByText("Theme: Light"));
    expect(mockCycle).toHaveBeenCalled();
  });

  test("calls redirectToAuth when sign out is clicked", async () => {
    render(<CustomUserButton />);
    await act(() => openDropdown(screen.getByRole("button")));
    fireEvent.click(screen.getByText("Sign out"));
    expect(mockRedirectToAuth).toHaveBeenCalled();
  });
});
