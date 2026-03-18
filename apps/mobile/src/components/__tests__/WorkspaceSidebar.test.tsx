import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { WorkspaceSidebar } from "../workspace/WorkspaceSidebar";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockClose = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({ close: mockClose }),
}));

let mockWorkspaces = [
  { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "", memberCount: 12 },
  { slug: "beta", name: "Beta Inc", role: "member", id: "ws-2", createdAt: "", memberCount: 5 },
];

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: { workspaces: mockWorkspaces },
  }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

describe("WorkspaceSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkspaces = [
      { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "", memberCount: 12 },
      { slug: "beta", name: "Beta Inc", role: "member", id: "ws-2", createdAt: "", memberCount: 5 },
    ];
  });

  it("renders workspace cards with name, member count, and role", () => {
    render(<WorkspaceSidebar />);

    expect(screen.getByTestId("workspace-sidebar")).toBeTruthy();
    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect(screen.getByText("Beta Inc")).toBeTruthy();
    expect(screen.getByText("12 members")).toBeTruthy();
    expect(screen.getByText("5 members")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByText("Member")).toBeTruthy();
  });

  it("renders workspace initials in cards", () => {
    render(<WorkspaceSidebar />);

    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("switches workspace when tapping a different card", () => {
    render(<WorkspaceSidebar />);

    fireEvent.press(screen.getByTestId("workspace-card-Beta Inc"));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(app)/beta/(channels)");
  });

  it("closes drawer without navigating when tapping current workspace", () => {
    render(<WorkspaceSidebar />);

    fireEvent.press(screen.getByTestId("workspace-card-Acme Corp"));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("navigates to create workspace on + button", () => {
    render(<WorkspaceSidebar />);

    fireEvent.press(screen.getByTestId("workspace-add-button"));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(app)/create-workspace");
  });

  it("shows settings button for admin/owner", () => {
    render(<WorkspaceSidebar />);

    expect(screen.getByTestId("workspace-settings-button")).toBeTruthy();
  });

  it("hides settings button for non-admin", () => {
    mockWorkspaces = [
      { slug: "acme", name: "Acme Corp", role: "member", id: "ws-1", createdAt: "", memberCount: 3 },
    ];

    render(<WorkspaceSidebar />);

    expect(screen.queryByTestId("workspace-settings-button")).toBeNull();
  });

  it("navigates to workspace settings", () => {
    render(<WorkspaceSidebar />);

    fireEvent.press(screen.getByTestId("workspace-settings-button"));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/workspace-settings");
  });

  it("handles singular member count", () => {
    mockWorkspaces = [
      { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "", memberCount: 1 },
    ];

    render(<WorkspaceSidebar />);

    expect(screen.getByText("1 member")).toBeTruthy();
  });

  it("handles missing member count gracefully", () => {
    mockWorkspaces = [
      { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "" } as any,
    ];

    render(<WorkspaceSidebar />);

    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
  });
});
