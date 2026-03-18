import { describe, test, expect, afterEach, jest, mock } from "bun:test";
import { render, screen, cleanup, act } from "../test-utils";
import { MemoryRouter } from "react-router-dom";

// Prevent @stripe/stripe-js side-effect
mock.module("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

let mockUser: { id: string } | null = { id: "user-1" };
mock.module("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

const mockListWorkspaces = jest.fn(async () => [
  { id: "ws-1", slug: "default", name: "Default Workspace", role: "owner", memberCount: 5, createdAt: "2026-01-01" },
]);

mock.module("../hooks/api/useWorkspacesApi", () => ({
  useWorkspacesApi: () => ({
    listWorkspaces: mockListWorkspaces,
  }),
}));

mock.module("../state/chat-store", () => ({
  useChatStore: () => ({ state: { presence: {} } }),
}));

mock.module("../components/settings/UserSettingsDialog", () => ({
  UserSettingsDialog: () => null,
}));

mock.module("../components/user/SetStatusDialog", () => ({
  SetStatusDialog: () => null,
}));

mock.module("../lib/auth", () => ({
  redirectToAuth: async () => {},
}));

const { WorkspaceListPage } = await import("./WorkspaceList");

afterEach(() => {
  cleanup();
  mockListWorkspaces.mockClear();
  mockUser = { id: "user-1" };
});

describe("WorkspaceListPage", () => {
  test("unauthenticated user sees sign-in button, no redirect", async () => {
    mockUser = null;
    await act(async () => {
      render(
        <MemoryRouter>
          <WorkspaceListPage />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("sign-in-button")).toBeDefined();
    expect(screen.getByTestId("sign-in-cta")).toBeDefined();
    expect(screen.getByTestId("nav-docs")).toBeDefined();
    expect(screen.getByTestId("nav-install")).toBeDefined();
    expect(mockListWorkspaces).not.toHaveBeenCalled();
  });

  test("authenticated user sees workspace list and user button", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <WorkspaceListPage />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("workspace-card-default")).toBeDefined();
    expect(screen.queryByTestId("sign-in-button")).toBeNull();
    expect(screen.queryByTestId("nav-docs")).toBeNull();
    expect(screen.queryByTestId("nav-install")).toBeNull();
  });
});
