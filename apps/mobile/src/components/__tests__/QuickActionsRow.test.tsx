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
    Svg: View,
    Path: View,
    Rect: View,
    Line: View,
  };
});

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceHover: "#e8e8e8",
        textPrimary: "#000",
        textSecondary: "#666",
        textMuted: "#888",
        borderDefault: "#ddd",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

let mockSavedMessageIds: string[] = [];

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      savedMessageIds: mockSavedMessageIds,
    },
  }),
}));

import { QuickActionsRow } from "../home/QuickActionsRow";

beforeEach(() => {
  mockPush.mockClear();
  mockSavedMessageIds = [];
});

describe("QuickActionsRow", () => {
  it("renders all four quick action cards", () => {
    render(<QuickActionsRow />);
    expect(screen.getByTestId("quick-action-threads")).toBeTruthy();
    expect(screen.getByTestId("quick-action-huddles")).toBeTruthy();
    expect(screen.getByTestId("quick-action-later")).toBeTruthy();
    expect(screen.getByTestId("quick-action-drafts")).toBeTruthy();
  });

  it("shows correct count units per card", () => {
    render(<QuickActionsRow />);
    expect(screen.getByText("0 new")).toBeTruthy();
    expect(screen.getByText("0 live")).toBeTruthy();
    expect(screen.getAllByText("0 items")).toHaveLength(2);
  });

  it("shows saved count on Later card with correct unit", () => {
    mockSavedMessageIds = ["msg-1", "msg-2", "msg-3"];
    render(<QuickActionsRow />);
    expect(screen.getByText("3 items")).toBeTruthy();
  });

  it("shows singular item for count of 1", () => {
    mockSavedMessageIds = ["msg-1"];
    render(<QuickActionsRow />);
    expect(screen.getByText("1 item")).toBeTruthy();
  });

  it("navigates to saved-items when Later is pressed", () => {
    render(<QuickActionsRow />);
    fireEvent.press(screen.getByTestId("quick-action-later"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/saved-items");
  });
});
