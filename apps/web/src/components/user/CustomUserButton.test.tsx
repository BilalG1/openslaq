import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

const mockUser = {
  id: "user-1",
  displayName: "Test User",
  primaryEmail: "test@example.com",
  profileImageUrl: "https://example.com/avatar.png",
};

vi.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

const mockRedirectToAuth = vi.fn(async () => {});
vi.mock("../../lib/auth", () => ({
  get redirectToAuth() { return mockRedirectToAuth; },
}));

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { presence: {} } }),
}));

vi.mock("../settings/UserSettingsDialog", () => ({
  UserSettingsDialog: () => null,
}));

vi.mock("./SetStatusDialog", () => ({
  SetStatusDialog: () => null,
}));

import { CustomUserButton } from "./CustomUserButton";

/** Radix DropdownMenu needs pointerdown to open */
function openDropdown(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.click(trigger);
}

describe("CustomUserButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
    expect(screen.getByText("Sign out")).toBeDefined();
  });

  test("calls redirectToAuth when sign out is clicked", async () => {
    render(<CustomUserButton />);
    await act(() => openDropdown(screen.getByRole("button")));
    fireEvent.click(screen.getByText("Sign out"));
    expect(mockRedirectToAuth).toHaveBeenCalled();
  });
});
