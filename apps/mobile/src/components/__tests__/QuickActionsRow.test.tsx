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
      brand: { primary: "#1264a3" },
    },
  }),
}));

let mockSavedMessageIds: string[] = [];

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      savedMessageIds: mockSavedMessageIds,
      activeHuddles: {},
    },
  }),
}));

import { QuickActionsRow } from "../home/QuickActionsRow";

beforeEach(() => {
  mockPush.mockClear();
  mockSavedMessageIds = [];
});

describe("QuickActionsRow", () => {
  it("renders all five quick action cards", () => {
    render(<QuickActionsRow />);
    expect(screen.getByTestId("quick-action-threads")).toBeTruthy();
    expect(screen.getByTestId("quick-action-huddles")).toBeTruthy();
    expect(screen.getByTestId("quick-action-later")).toBeTruthy();
    expect(screen.getByTestId("quick-action-outbox")).toBeTruthy();
    expect(screen.getByTestId("quick-action-files")).toBeTruthy();
  });

  it("hides count labels when count is 0", () => {
    render(<QuickActionsRow />);
    expect(screen.queryByText("0 new")).toBeNull();
    expect(screen.queryByText("0 live")).toBeNull();
    expect(screen.queryByText("0 items")).toBeNull();
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

  it("navigates to outbox when Outbox is pressed", () => {
    render(<QuickActionsRow />);
    fireEvent.press(screen.getByTestId("quick-action-outbox"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/outbox");
  });

  it("navigates to files when Files is pressed", () => {
    render(<QuickActionsRow />);
    fireEvent.press(screen.getByTestId("quick-action-files"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/files");
  });
});
