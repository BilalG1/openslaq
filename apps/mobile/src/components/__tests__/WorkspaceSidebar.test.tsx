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
  { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "" },
  { slug: "beta", name: "Beta Inc", role: "member", id: "ws-2", createdAt: "" },
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
      brand: { primary: "#4A154B" },
    },
  }),
}));

describe("WorkspaceSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkspaces = [
      { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "" },
      { slug: "beta", name: "Beta Inc", role: "member", id: "ws-2", createdAt: "" },
    ];
  });

  it("renders workspace list", () => {
    render(<WorkspaceSidebar />);

    expect(screen.getByTestId("workspace-sidebar")).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("switches workspace when tapping a different one", () => {
    render(<WorkspaceSidebar />);

    fireEvent.press(screen.getByTestId("workspace-icon-Beta Inc"));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(app)/beta/(channels)");
  });

  it("closes drawer without navigating when tapping current workspace", () => {
    render(<WorkspaceSidebar />);

    fireEvent.press(screen.getByTestId("workspace-icon-Acme Corp"));

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
      { slug: "acme", name: "Acme Corp", role: "member", id: "ws-1", createdAt: "" },
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
});
