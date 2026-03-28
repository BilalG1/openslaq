import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../test-utils";
import { fireEvent } from "@testing-library/react";

// Prevent @stripe/stripe-js side-effect
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

const mockUser = { id: "user-1" };
vi.mock("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

const sampleListings = [
  {
    id: "listing-1",
    slug: "standup-bot",
    name: "Standup Bot",
    description: "Daily standups",
    longDescription: "Full description here",
    avatarUrl: null,
    category: "productivity",
    requestedScopes: ["chat:write", "chat:read"],
    requestedEvents: ["message:new"],
    published: true,
  },
  {
    id: "listing-2",
    slug: "welcome-bot",
    name: "Welcome Bot",
    description: "Greet new members",
    longDescription: null,
    avatarUrl: null,
    category: "productivity",
    requestedScopes: ["chat:write"],
    requestedEvents: [],
    published: true,
  },
];

const mockListListings = vi.fn(async () => [...sampleListings]);
const mockInstall = vi.fn(async () => {});
const mockUninstall = vi.fn(async () => {});
const mockGetInstalled = vi.fn(async () => [] as string[]);
const mockGetListing = vi.fn(async () => sampleListings[0]!);

vi.mock("../hooks/api/useMarketplaceApi", () => ({
  useMarketplaceApi: () => ({
    listListings: mockListListings,
    getListing: mockGetListing,
    install: mockInstall,
    uninstall: mockUninstall,
    getInstalled: mockGetInstalled,
  }),
}));

const mockListWorkspaces = vi.fn(async () => [
  { slug: "default", name: "Default Workspace", role: "owner", memberCount: 5, id: "ws-1", createdAt: "2026-01-01" },
]);

vi.mock("../hooks/api/useWorkspacesApi", () => ({
  useWorkspacesApi: () => ({
    listWorkspaces: mockListWorkspaces,
  }),
}));

vi.mock("../lib/auth", () => ({
  redirectToAuth: async () => {},
}));

import { MarketplacePage } from "./MarketplacePage";

afterEach(cleanup);

describe("MarketplacePage", () => {
  test("renders marketplace grid with listings", async () => {
    await act(async () => {
      render(<MarketplacePage />);
    });

    // Wait for data to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("Bot Marketplace")).toBeTruthy();
    expect(screen.getByText("Standup Bot")).toBeTruthy();
    expect(screen.getByText("Welcome Bot")).toBeTruthy();
  });

  test("shows empty state when no listings", async () => {
    mockListListings.mockImplementationOnce(async () => []);

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId("marketplace-empty")).toBeTruthy();
  });

  test("clicking a listing shows detail view", async () => {
    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    expect(screen.getByTestId("listing-detail")).toBeTruthy();
    expect(screen.getByText("Standup Bot")).toBeTruthy();
    expect(screen.getByTestId("install-button")).toBeTruthy();
  });

  test("back button returns to grid", async () => {
    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    expect(screen.getByTestId("listing-detail")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText(/Back to marketplace/));
    });

    expect(screen.getByTestId("marketplace-grid")).toBeTruthy();
  });

  test("handles loadData error without crashing", async () => {
    mockListListings.mockImplementationOnce(async () => {
      throw new Error("Network error");
    });

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Page should still render (loading finishes, no crash)
    expect(screen.getByText("Bot Marketplace")).toBeTruthy();
  });

  test("install does nothing when no admin workspaces", async () => {
    mockListWorkspaces.mockImplementationOnce(async () => [
      { slug: "default", name: "Default Workspace", role: "member", memberCount: 5, id: "ws-1", createdAt: "2026-01-01" },
    ]);

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-button"));
    });

    // Should not have called install
    expect(mockInstall).not.toHaveBeenCalled();
  });

  test("install with 1 admin workspace installs directly without consent dialog", async () => {
    mockInstall.mockClear();

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-button"));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Should have called install directly with the single admin workspace
    expect(mockInstall).toHaveBeenCalledWith("default", "listing-1");
    // Consent dialog should NOT appear
    expect(screen.queryByTestId("install-consent-dialog")).toBeNull();
  });

  test("install with multiple admin workspaces opens consent dialog", async () => {
    mockListWorkspaces.mockImplementationOnce(async () => [
      { slug: "ws-1", name: "Workspace One", role: "admin", memberCount: 5, id: "ws-1", createdAt: "2026-01-01" },
      { slug: "ws-2", name: "Workspace Two", role: "owner", memberCount: 3, id: "ws-2", createdAt: "2026-01-01" },
    ]);

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-button"));
    });

    // Consent dialog should appear
    expect(screen.getByTestId("install-consent-dialog")).toBeTruthy();
    expect(screen.getByText("Install Standup Bot")).toBeTruthy();
  });

  test("doInstall marks listing as installed", async () => {
    mockInstall.mockClear();

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-button"));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // After install, the listing should show as installed (uninstall button visible)
    expect(screen.getByTestId("uninstall-button")).toBeTruthy();
  });

  test("handleUninstall removes listing from installed set", async () => {
    mockInstall.mockClear();
    mockUninstall.mockClear();

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // First install the listing
    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-button"));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId("uninstall-button")).toBeTruthy();

    // Now uninstall
    await act(async () => {
      fireEvent.click(screen.getByTestId("uninstall-button"));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockUninstall).toHaveBeenCalledWith("default", "listing-1");
    // Should show install button again
    expect(screen.getByTestId("install-button")).toBeTruthy();
  });

  test("consent dialog integration: confirming triggers install", async () => {
    mockInstall.mockClear();
    mockListWorkspaces.mockImplementationOnce(async () => [
      { slug: "ws-1", name: "Workspace One", role: "admin", memberCount: 5, id: "ws-1", createdAt: "2026-01-01" },
      { slug: "ws-2", name: "Workspace Two", role: "owner", memberCount: 3, id: "ws-2", createdAt: "2026-01-01" },
    ]);

    await act(async () => {
      render(<MarketplacePage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("listing-card-standup-bot"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-button"));
    });

    // Consent dialog should appear
    expect(screen.getByTestId("install-consent-dialog")).toBeTruthy();

    // Click confirm
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-install-button"));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Should have called install with the first admin workspace (default selected)
    expect(mockInstall).toHaveBeenCalledWith("ws-1", "listing-1");
    // Consent dialog should close
    expect(screen.queryByTestId("install-consent-dialog")).toBeNull();
  });
});
