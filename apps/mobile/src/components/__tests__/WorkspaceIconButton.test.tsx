import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { WorkspaceIconButton } from "../workspace/WorkspaceIconButton";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        textPrimary: "#000",
        textSecondary: "#666",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

let mockState: any = {};
jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState }),
}));

const mockToggle = jest.fn();
jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({ toggle: mockToggle }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

describe("WorkspaceIconButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      workspaces: [{ slug: "acme", name: "Acme Corp" }],
    };
  });

  it("renders uppercased first letter of workspace name", () => {
    render(<WorkspaceIconButton />);

    expect(screen.getByText("A")).toBeTruthy();
  });

  it("shows '?' when workspace slug not found in state", () => {
    mockState.workspaces = [];

    render(<WorkspaceIconButton />);

    expect(screen.getByText("?")).toBeTruthy();
  });

  it("calls toggle() on press", () => {
    render(<WorkspaceIconButton />);

    fireEvent.press(screen.getByTestId("workspace-icon-button"));

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
