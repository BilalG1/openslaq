import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

vi.mock("./BotCreateDialog", () => ({
  BotCreateDialog: () => null,
}));
vi.mock("./BotConfigDialog", () => ({
  BotConfigDialog: () => null,
}));
vi.mock("./CustomEmojiManager", () => ({
  CustomEmojiManager: () => null,
}));
vi.mock("./IntegrationsTab", () => ({
  IntegrationsTab: () => null,
}));

// Must be a stable reference so effect deps don't loop
const mockUser = { id: "user-1" };
vi.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

// Prevent @stripe/stripe-js side-effect script injection in happy-dom
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

// Default members: owner, admin, regular member
const defaultMembers = [
  { id: "user-1", displayName: "Owner", email: "owner@test.com", avatarUrl: null, role: "owner" },
  { id: "user-2", displayName: "AdminUser", email: "admin@test.com", avatarUrl: null, role: "admin" },
  { id: "user-3", displayName: "Member", email: "member@test.com", avatarUrl: null, role: "member" },
];

const mockListMembers = vi.fn(async () => [...defaultMembers]);
const mockUpdateRole = vi.fn(async () => {});
const mockRemoveMember = vi.fn(async () => {});
const mockLeaveWorkspace = vi.fn(async () => {});
const mockDeleteWorkspace = vi.fn(async () => {});

vi.mock("../../hooks/api/useWorkspaceMembersApi", () => ({
  useWorkspaceMembersApi: () => ({
    listMembers: mockListMembers,
    updateRole: mockUpdateRole,
    removeMember: mockRemoveMember,
    leaveWorkspace: mockLeaveWorkspace,
    deleteWorkspace: mockDeleteWorkspace,
  }),
}));

const mockListWorkspaces = vi.fn(async () => [{ slug: "default", name: "Default Workspace" }]);
vi.mock("../../hooks/api/useWorkspacesApi", () => ({
  useWorkspacesApi: () => ({
    listWorkspaces: mockListWorkspaces,
  }),
}));

const defaultBots: unknown[] = [];
const mockListBotApps = vi.fn(async () => [...defaultBots]);
const mockToggleBotEnabled = vi.fn(async () => {});
vi.mock("../../hooks/api/useBotsApi", () => ({
  useBotsApi: () => ({
    listBotApps: mockListBotApps,
    toggleBotEnabled: mockToggleBotEnabled,
  }),
}));

const mockListListings = vi.fn(async () => []);
const mockInstallListing = vi.fn(async () => {});
const mockUninstallListing = vi.fn(async () => {});
const mockGetInstalled = vi.fn(async () => []);
vi.mock("../../hooks/api/useMarketplaceApi", () => ({
  useMarketplaceApi: () => ({
    listListings: mockListListings,
    install: mockInstallListing,
    uninstall: mockUninstallListing,
    getInstalled: mockGetInstalled,
  }),
}));

const mockGetFeatureFlags = vi.fn(async () => ({
  integrationGithub: false,
  integrationLinear: false,
  integrationSentry: false,
  integrationVercel: false,
}));
vi.mock("../../hooks/api/useFeatureFlagsApi", () => ({
  useFeatureFlagsApi: () => ({
    getFeatureFlags: mockGetFeatureFlags,
  }),
}));

const mockDispatch = vi.fn();
vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({ state: {}, dispatch: mockDispatch }),
}));

import { WorkspaceSettingsDialog } from "./WorkspaceSettingsDialog";

async function renderDialog() {
  await act(async () => {
    render(
      <WorkspaceSettingsDialog open={true} onOpenChange={() => {}} workspaceSlug="default" />,
    );
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe("WorkspaceSettingsDialog", () => {
  beforeEach(() => {
    localStorage.removeItem("openslaq-dev-session");
    mockListMembers.mockImplementation(async () => [...defaultMembers]);
    mockListBotApps.mockImplementation(async () => [...defaultBots]);
    mockUpdateRole.mockClear();
    mockRemoveMember.mockClear();
    mockLeaveWorkspace.mockClear();
    mockDeleteWorkspace.mockClear();
    mockToggleBotEnabled.mockClear();
    mockDispatch.mockClear();
  });

  afterEach(cleanup);

  // ── Existing test ──────────────────────────────────────────────

  test("renders Bots section with Add Bot button when canManage", async () => {
    await renderDialog();
    // Bots are behind the sidebar tab
    await act(async () => {
      fireEvent.click(screen.getByText("Bots"));
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("add-bot-btn")).toBeTruthy();
    expect(screen.getByTestId("add-bot-btn").textContent).toBe("Add Bot");
  });

  // ── Member rendering ──────────────────────────────────────────

  test("renders member rows with name, email, role badge", async () => {
    await renderDialog();

    expect(screen.getByTestId("member-row-user-1")).toBeTruthy();
    expect(screen.getByTestId("member-row-user-2")).toBeTruthy();
    expect(screen.getByTestId("member-row-user-3")).toBeTruthy();

    // Check role badges
    expect(screen.getByTestId("role-badge-user-1").textContent).toBe("owner");
    expect(screen.getByTestId("role-badge-user-2").textContent).toBe("admin");
    expect(screen.getByTestId("role-badge-user-3").textContent).toBe("member");
  });

  test('shows "(you)" label for current user\'s row', async () => {
    await renderDialog();
    const row = screen.getByTestId("member-row-user-1");
    expect(row.textContent).toContain("(you)");
  });

  test("clicking member name dispatches workspace/openProfile and closes dialog", async () => {
    const onOpenChange = vi.fn();
    await act(async () => {
      render(
        <WorkspaceSettingsDialog open={true} onOpenChange={onOpenChange} workspaceSlug="default" />,
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    // Click the member name button (first one we find for user-2)
    const row = screen.getByTestId("member-row-user-2");
    const nameButton = row.querySelectorAll("button")[1]; // second button is the name
    fireEvent.click(nameButton!);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "workspace/openProfile", userId: "user-2" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Role management ────────────────────────────────────────────

  test("shows role-change dropdown for non-owner members when current user is owner", async () => {
    await renderDialog();
    // Owner (user-1) viewing — should see role dropdowns for user-2 and user-3
    expect(screen.getByTestId("role-select-user-2")).toBeTruthy();
    expect(screen.getByTestId("role-select-user-3")).toBeTruthy();
  });

  test("does NOT show role dropdown for the current user's own row", async () => {
    await renderDialog();
    expect(screen.queryByTestId("role-select-user-1")).toBeNull();
  });

  test("does NOT show role dropdown when current user is regular member", async () => {
    // Make current user a regular member
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
      { id: "user-2", displayName: "Admin", email: "admin@test.com", avatarUrl: null, role: "admin" },
    ]);

    await renderDialog();
    expect(screen.queryByTestId("role-select-user-2")).toBeNull();
  });

  // ── Remove member ──────────────────────────────────────────────

  test("shows remove button for removable members", async () => {
    await renderDialog();
    // Owner can remove admin and regular member
    expect(screen.getByTestId("remove-btn-user-2")).toBeTruthy();
    expect(screen.getByTestId("remove-btn-user-3")).toBeTruthy();
  });

  test("does NOT show remove button for owner or self", async () => {
    await renderDialog();
    // user-1 is owner (self) — no remove button
    expect(screen.queryByTestId("remove-btn-user-1")).toBeNull();
  });

  test("remove button calls removeMember after confirm", async () => {
    await renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-btn-user-3"));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Confirm dialog should appear
    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRemoveMember).toHaveBeenCalledWith("default", "user-3");
  });

  test("remove button does nothing when confirm is cancelled", async () => {
    await renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-btn-user-3"));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRemoveMember).not.toHaveBeenCalled();
  });

  // ── Bot rows ───────────────────────────────────────────────────

  async function navigateToBotsTab() {
    await act(async () => {
      fireEvent.click(screen.getByText("Bots"));
      await new Promise((r) => setTimeout(r, 50));
    });
  }

  test("renders bot rows with name, APP badge when bots exist", async () => {
    mockListBotApps.mockImplementation(async () => [
      { id: "bot-1", name: "TestBot", description: "A test bot", enabled: true, avatarUrl: null },
    ]);

    await renderDialog();
    await navigateToBotsTab();

    expect(screen.getByTestId("bot-row-bot-1")).toBeTruthy();
    const botRow = screen.getByTestId("bot-row-bot-1");
    expect(botRow.textContent).toContain("TestBot");
    expect(botRow.textContent).toContain("APP");
  });

  test('shows "Disabled" badge when bot.enabled=false', async () => {
    mockListBotApps.mockImplementation(async () => [
      { id: "bot-1", name: "TestBot", description: "", enabled: false, avatarUrl: null },
    ]);

    await renderDialog();
    await navigateToBotsTab();

    const botRow = screen.getByTestId("bot-row-bot-1");
    expect(botRow.textContent).toContain("Disabled");
  });

  test("toggle checkbox calls toggleBotEnabled", async () => {
    mockListBotApps.mockImplementation(async () => [
      { id: "bot-1", name: "TestBot", description: "", enabled: true, avatarUrl: null },
    ]);

    await renderDialog();
    await navigateToBotsTab();

    const toggle = screen.getByTestId("bot-toggle-bot-1");
    await act(async () => {
      fireEvent.click(toggle);
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockToggleBotEnabled).toHaveBeenCalledWith("default", "bot-1", false);
  });

  test("configure button is rendered for bots", async () => {
    mockListBotApps.mockImplementation(async () => [
      { id: "bot-1", name: "TestBot", description: "", enabled: true, avatarUrl: null },
    ]);

    await renderDialog();
    await navigateToBotsTab();
    expect(screen.getByTestId("configure-bot-bot-1")).toBeTruthy();
  });

  // ── Delete workspace ───────────────────────────────────────────

  async function navigateToDangerTab() {
    await act(async () => {
      fireEvent.click(screen.getByText("Danger Zone"));
      await new Promise((r) => setTimeout(r, 50));
    });
  }

  test("shows delete section only when current user is owner", async () => {
    await renderDialog();
    await navigateToDangerTab();
    expect(screen.getByTestId("delete-workspace-btn")).toBeTruthy();
  });

  test("non-owner sees Danger Zone with leave but not delete", async () => {
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
    ]);

    await renderDialog();
    // Danger Zone tab should be visible for non-owners
    expect(screen.queryByText("Danger Zone")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("Danger Zone"));
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("leave-workspace-btn")).toBeTruthy();
    expect(screen.queryByTestId("delete-workspace-btn")).toBeNull();
  });

  test("delete button is disabled until input matches workspace name", async () => {
    await renderDialog();
    await navigateToDangerTab();
    const btn = screen.getByTestId("delete-workspace-btn");
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  test("typing correct name enables the delete button", async () => {
    await renderDialog();
    await navigateToDangerTab();

    const input = screen.getByTestId("delete-workspace-input");
    fireEvent.change(input, { target: { value: "Default Workspace" } });

    const btn = screen.getByTestId("delete-workspace-btn");
    expect(btn.hasAttribute("disabled")).toBe(false);
  });

  test("clicking delete calls deleteWorkspace", async () => {
    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    await renderDialog();
    await navigateToDangerTab();

    const input = screen.getByTestId("delete-workspace-input");
    fireEvent.change(input, { target: { value: "Default Workspace" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-workspace-btn"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockDeleteWorkspace).toHaveBeenCalledWith("default");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  // ── Leave workspace ──────────────────────────────────────────────

  test("owner does NOT see leave workspace button", async () => {
    await renderDialog();
    await navigateToDangerTab();
    expect(screen.queryByTestId("leave-workspace-btn")).toBeNull();
    expect(screen.getByTestId("delete-workspace-btn")).toBeTruthy();
  });

  test("leave button shows confirm dialog and calls leaveWorkspace", async () => {
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
    ]);

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    await renderDialog();
    await act(async () => {
      fireEvent.click(screen.getByText("Danger Zone"));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("leave-workspace-btn"));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Confirm dialog should appear
    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockLeaveWorkspace).toHaveBeenCalledWith("default");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  test("leave confirm cancel does not call leaveWorkspace", async () => {
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
    ]);

    await renderDialog();
    await act(async () => {
      fireEvent.click(screen.getByText("Danger Zone"));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("leave-workspace-btn"));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockLeaveWorkspace).not.toHaveBeenCalled();
  });

  // ── Error states ───────────────────────────────────────────────

  test("shows error message when listMembers rejects", async () => {
    mockListMembers.mockImplementation(async () => {
      throw new Error("Network error");
    });

    await renderDialog();
    expect(screen.getByText("Network error")).toBeTruthy();
  });

  // ── Bots section visibility ────────────────────────────────────

  test("does NOT show Bots tab for regular members", async () => {
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
    ]);

    await renderDialog();
    // Bots tab should not be visible for regular members
    expect(screen.queryByText("Bots")).toBeNull();
  });
});
