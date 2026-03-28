import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import NoWorkspacesScreen from "../../../app/(app)/no-workspaces";

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock("@/components/workspace/JoinWorkspaceForm", () => ({
  JoinWorkspaceForm: ({ onJoined }: { onJoined: (slug: string) => void }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable testID="mock-join-form" onPress={() => onJoined("test-ws")}>
        <Text>JoinWorkspaceForm</Text>
      </Pressable>
    );
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
        textFaint: "#999",
        borderDefault: "#ddd",
        dangerText: "#dc2626",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

describe("NoWorkspacesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders welcome screen with join form and create button", () => {
    render(<NoWorkspacesScreen />);

    expect(screen.getByTestId("no-workspaces-screen")).toBeTruthy();
    expect(screen.getByText("Welcome to OpenSlaq")).toBeTruthy();
    expect(screen.getByText("JoinWorkspaceForm")).toBeTruthy();
    expect(screen.getByTestId("create-workspace-button")).toBeTruthy();
  });

  it("navigates to create-workspace screen", () => {
    render(<NoWorkspacesScreen />);

    fireEvent.press(screen.getByTestId("create-workspace-button"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/create-workspace");
  });

  it("navigates to workspace channels when join form succeeds", () => {
    render(<NoWorkspacesScreen />);

    fireEvent.press(screen.getByTestId("mock-join-form"));

    expect(mockReplace).toHaveBeenCalledWith("/(app)/test-ws/(tabs)/(channels)");
  });
});
