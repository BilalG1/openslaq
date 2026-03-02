import React from "react";
import { Text, Animated } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockOpen = jest.fn();
const mockClose = jest.fn();
let mockIsOpen = false;

jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({
    isOpen: mockIsOpen,
    open: mockOpen,
    close: mockClose,
  }),
}));

jest.mock("../workspace/WorkspaceSidebar", () => ({
  WorkspaceSidebar: () => {
    const { Text: T } = require("react-native");
    return <T testID="mock-sidebar">Sidebar</T>;
  },
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

// Replace Animated.timing to avoid native renderer
const originalTiming = Animated.timing;
beforeAll(() => {
  (Animated as any).timing = () => ({ start: jest.fn() });
});
afterAll(() => {
  (Animated as any).timing = originalTiming;
});

import { WorkspaceDrawer } from "../workspace/WorkspaceDrawer";

describe("WorkspaceDrawer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOpen = false;
  });

  it("renders children", () => {
    render(
      <WorkspaceDrawer>
        <Text>Child Content</Text>
      </WorkspaceDrawer>,
    );

    expect(screen.getByText("Child Content")).toBeTruthy();
  });

  it("renders sidebar", () => {
    render(
      <WorkspaceDrawer>
        <Text>Child</Text>
      </WorkspaceDrawer>,
    );

    expect(screen.getByTestId("mock-sidebar")).toBeTruthy();
  });

  it("does not render backdrop when closed", () => {
    render(
      <WorkspaceDrawer>
        <Text>Child</Text>
      </WorkspaceDrawer>,
    );

    expect(screen.queryByTestId("drawer-backdrop")).toBeNull();
  });

  it("renders backdrop when open", () => {
    mockIsOpen = true;
    render(
      <WorkspaceDrawer>
        <Text>Child</Text>
      </WorkspaceDrawer>,
    );

    expect(screen.getByTestId("drawer-backdrop")).toBeTruthy();
  });

  it("calls close when backdrop is pressed", () => {
    mockIsOpen = true;
    render(
      <WorkspaceDrawer>
        <Text>Child</Text>
      </WorkspaceDrawer>,
    );

    fireEvent.press(screen.getByTestId("drawer-backdrop"));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
