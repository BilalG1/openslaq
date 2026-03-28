import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Svg: (props: Record<string, unknown>) => <View {...props} />,
    Path: View,
    Rect: View,
    Line: View,
    Circle: View,
    Polyline: View,
  };
});

jest.mock("@/contexts/WorkspaceBootstrapProvider", () => ({
  useWorkspaceSlug: () => "acme",
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceHover: "#e8e8e8",
        textPrimary: "#000",
        textSecondary: "#666",
        border: "#ddd",
      },
    },
  }),
}));

import MoreScreen from "../../../app/(app)/[workspaceSlug]/(tabs)/more";

beforeEach(() => {
  mockPush.mockClear();
});

describe("MoreScreen", () => {
  it("renders all menu items", () => {
    render(<MoreScreen />);
    expect(screen.getByText("More")).toBeTruthy();
    expect(screen.getByText("Files")).toBeTruthy();
    expect(screen.getByText("Saved Items")).toBeTruthy();
    expect(screen.getByText("Outbox")).toBeTruthy();
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("navigates to Files on press", () => {
    render(<MoreScreen />);
    fireEvent.press(screen.getByText("Files"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/files");
  });

  it("navigates to Saved Items on press", () => {
    render(<MoreScreen />);
    fireEvent.press(screen.getByText("Saved Items"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/saved-items");
  });

  it("navigates to Outbox on press", () => {
    render(<MoreScreen />);
    fireEvent.press(screen.getByText("Outbox"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/outbox");
  });

  it("navigates to Settings on press", () => {
    render(<MoreScreen />);
    fireEvent.press(screen.getAllByText("Settings")[0]);
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/settings");
  });

  it("has the correct testID", () => {
    render(<MoreScreen />);
    expect(screen.getByTestId("more-screen")).toBeTruthy();
  });
});
