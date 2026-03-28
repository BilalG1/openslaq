// Override safe-area mock with realistic device insets (notch + home indicator)
const MOCK_INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => MOCK_INSETS,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({ close: jest.fn() }),
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

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      workspaces: [
        { slug: "acme", name: "Acme", role: "owner", memberCount: 5 },
        { slug: "other", name: "Other", role: "member", memberCount: 3 },
      ],
    },
  }),
}));

jest.mock("@/theme/constants", () => ({
  TRANSPARENT: "transparent",
  WHITE: "#fff",
}));

import { WorkspaceSidebar } from "../workspace/WorkspaceSidebar";

describe("WorkspaceSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should apply safe area insets so content is not clipped on notched devices", () => {
    render(<WorkspaceSidebar />);
    const sidebar = screen.getByTestId("workspace-sidebar");
    const flatStyle = Array.isArray(sidebar.props.style)
      ? Object.assign({}, ...sidebar.props.style)
      : sidebar.props.style;

    expect(flatStyle.paddingTop).toBeGreaterThanOrEqual(MOCK_INSETS.top);
    expect(flatStyle.paddingBottom).toBeGreaterThanOrEqual(MOCK_INSETS.bottom);
  });

  it("renders Add workspace button", () => {
    render(<WorkspaceSidebar />);

    const button = screen.getByTestId("workspace-add-button");
    expect(button).toBeTruthy();
    expect(screen.getByText("Add workspace")).toBeTruthy();
  });

  it("shows alert with join and create options when Add workspace is pressed", () => {
    const spy = jest.spyOn(Alert, "alert");

    render(<WorkspaceSidebar />);
    fireEvent.press(screen.getByTestId("workspace-add-button"));

    expect(spy).toHaveBeenCalledWith(
      "Add Workspace",
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: "Join a Workspace" }),
        expect.objectContaining({ text: "Create a Workspace" }),
        expect.objectContaining({ text: "Cancel", style: "cancel" }),
      ]),
    );

    spy.mockRestore();
  });

  it("navigates to join-workspace when Join is selected", () => {
    const spy = jest.spyOn(Alert, "alert");

    render(<WorkspaceSidebar />);
    fireEvent.press(screen.getByTestId("workspace-add-button"));

    const buttons = spy.mock.calls[0]![2] as Array<{ text: string; onPress?: () => void }>;
    const joinButton = buttons.find((b) => b.text === "Join a Workspace");
    joinButton?.onPress?.();

    expect(mockPush).toHaveBeenCalledWith("/(app)/join-workspace");

    spy.mockRestore();
  });

  it("navigates to create-workspace when Create is selected", () => {
    const spy = jest.spyOn(Alert, "alert");

    render(<WorkspaceSidebar />);
    fireEvent.press(screen.getByTestId("workspace-add-button"));

    const buttons = spy.mock.calls[0]![2] as Array<{ text: string; onPress?: () => void }>;
    const createButton = buttons.find((b) => b.text === "Create a Workspace");
    createButton?.onPress?.();

    expect(mockPush).toHaveBeenCalledWith("/(app)/create-workspace");

    spy.mockRestore();
  });
});
