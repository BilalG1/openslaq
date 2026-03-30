import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../test-utils";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "../components/ui";

// Prevent @stripe/stripe-js side-effect
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

let mockUser: { id: string } | null = { id: "user-1" };
vi.mock("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

const mockListWorkspaces = vi.fn(async () => [
  { id: "ws-1", slug: "default", name: "Default Workspace", role: "owner", memberCount: 5, createdAt: "2026-01-01" },
]);

vi.mock("../hooks/api/useWorkspacesApi", () => ({
  useWorkspacesApi: () => ({
    listWorkspaces: mockListWorkspaces,
  }),
}));

vi.mock("../state/chat-store", () => ({
  useChatStore: () => ({ state: { presence: {} } }),
}));

vi.mock("../components/settings/UserSettingsDialog", () => ({
  UserSettingsDialog: () => null,
}));

vi.mock("../components/user/SetStatusDialog", () => ({
  SetStatusDialog: () => null,
}));

vi.mock("../lib/auth", () => ({
  redirectToAuth: async () => {},
}));

vi.mock("../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
  useGalleryMockData: () => null,
}));

import { WorkspaceListPage } from "./WorkspaceList";

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
          <TooltipProvider>
            <WorkspaceListPage />
          </TooltipProvider>
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("sign-in-button")).toBeDefined();
    expect(screen.getByTestId("sign-in-cta")).toBeDefined();
    expect(screen.getByTestId("nav-docs")).toBeDefined();
    expect(screen.getByTestId("nav-install")).toBeDefined();
    expect(screen.getByTestId("nav-github")).toBeDefined();
    expect(mockListWorkspaces).not.toHaveBeenCalled();
  });

  test("authenticated user sees workspace list and user button", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <TooltipProvider>
            <WorkspaceListPage />
          </TooltipProvider>
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("workspace-card-default")).toBeDefined();
    expect(screen.queryByTestId("sign-in-button")).toBeNull();
    expect(screen.getByTestId("nav-docs")).toBeDefined();
    expect(screen.getByTestId("nav-install")).toBeDefined();
    expect(screen.getByTestId("nav-github")).toBeDefined();
  });
});
