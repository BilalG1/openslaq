import { describe, test, expect, afterEach, beforeEach, jest, mock } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

mock.module("./BotCreateDialog", () => ({
  BotCreateDialog: () => null,
}));
mock.module("./BotConfigDialog", () => ({
  BotConfigDialog: () => null,
}));
mock.module("./CustomEmojiManager", () => ({
  CustomEmojiManager: () => null,
}));

// Must be a stable reference so effect deps don't loop
const mockUser = { id: "user-1" };
mock.module("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

// Prevent @stripe/stripe-js side-effect script injection in happy-dom
mock.module("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

// Default members: owner, admin, regular member
const defaultMembers = [
  { id: "user-1", displayName: "Owner", email: "owner@test.com", avatarUrl: null, role: "owner" },
  { id: "user-2", displayName: "AdminUser", email: "admin@test.com", avatarUrl: null, role: "admin" },
  { id: "user-3", displayName: "Member", email: "member@test.com", avatarUrl: null, role: "member" },
];

const mockListMembers = jest.fn(async () => [...defaultMembers]);
const mockUpdateRole = jest.fn(async () => {});
const mockRemoveMember = jest.fn(async () => {});
const mockDeleteWorkspace = jest.fn(async () => {});

mock.module("../../hooks/api/useWorkspaceMembersApi", () => ({
  useWorkspaceMembersApi: () => ({
    listMembers: mockListMembers,
    updateRole: mockUpdateRole,
    removeMember: mockRemoveMember,
    deleteWorkspace: mockDeleteWorkspace,
  }),
}));

const mockListWorkspaces = jest.fn(async () => [{ slug: "default", name: "Default Workspace" }]);
mock.module("../../hooks/api/useWorkspacesApi", () => ({
  useWorkspacesApi: () => ({
    listWorkspaces: mockListWorkspaces,
  }),
}));

const defaultBots: any[] = [];
const mockListBotApps = jest.fn(async () => [...defaultBots]);
const mockToggleBotEnabled = jest.fn(async () => {});
mock.module("../../hooks/api/useBotsApi", () => ({
  useBotsApi: () => ({
    listBotApps: mockListBotApps,
    toggleBotEnabled: mockToggleBotEnabled,
  }),
}));

const mockDispatch = jest.fn();
mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({ state: {}, dispatch: mockDispatch }),
}));

const { WorkspaceSettingsDialog } = await import("./WorkspaceSettingsDialog");

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
    mockDeleteWorkspace.mockClear();
    mockToggleBotEnabled.mockClear();
    mockDispatch.mockClear();
  });

  afterEach(cleanup);

  // ── Existing test ──────────────────────────────────────────────

  test("renders Bots section with Add Bot button when canManage", async () => {
    await renderDialog();
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
    const onOpenChange = jest.fn();
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
    // Mock window.confirm
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = () => true;

    await renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-btn-user-3"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRemoveMember).toHaveBeenCalledWith("default", "user-3");
    globalThis.confirm = originalConfirm;
  });

  test("remove button does nothing when confirm is cancelled", async () => {
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = () => false;

    await renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-btn-user-3"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRemoveMember).not.toHaveBeenCalled();
    globalThis.confirm = originalConfirm;
  });

  // ── Bot rows ───────────────────────────────────────────────────

  test("renders bot rows with name, APP badge when bots exist", async () => {
    mockListBotApps.mockImplementation(async () => [
      { id: "bot-1", name: "TestBot", description: "A test bot", enabled: true, avatarUrl: null },
    ]);

    await renderDialog();

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

    const botRow = screen.getByTestId("bot-row-bot-1");
    expect(botRow.textContent).toContain("Disabled");
  });

  test("toggle checkbox calls toggleBotEnabled", async () => {
    mockListBotApps.mockImplementation(async () => [
      { id: "bot-1", name: "TestBot", description: "", enabled: true, avatarUrl: null },
    ]);

    await renderDialog();

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
    expect(screen.getByTestId("configure-bot-bot-1")).toBeTruthy();
  });

  // ── Delete workspace ───────────────────────────────────────────

  test("shows delete section only when current user is owner", async () => {
    await renderDialog();
    expect(screen.getByTestId("delete-workspace-btn")).toBeTruthy();
  });

  test("does NOT show delete section for non-owner", async () => {
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
    ]);

    await renderDialog();
    expect(screen.queryByTestId("delete-workspace-btn")).toBeNull();
  });

  test("delete button is disabled until input matches workspace name", async () => {
    await renderDialog();
    const btn = screen.getByTestId("delete-workspace-btn");
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  test("typing correct name enables the delete button", async () => {
    await renderDialog();

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

  // ── Error states ───────────────────────────────────────────────

  test("shows error message when listMembers rejects", async () => {
    mockListMembers.mockImplementation(async () => {
      throw new Error("Network error");
    });

    await renderDialog();
    expect(screen.getByText("Network error")).toBeTruthy();
  });

  // ── Bots section visibility ────────────────────────────────────

  test("does NOT show Bots section for regular members", async () => {
    mockListMembers.mockImplementation(async () => [
      { id: "user-1", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "member" },
    ]);

    await renderDialog();
    expect(screen.queryByTestId("add-bot-btn")).toBeNull();
  });
});
