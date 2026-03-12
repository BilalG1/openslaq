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

jest.mock("@/lib/draft-storage", () => ({
  getAllDraftKeys: jest.fn(() => Promise.resolve([])),
}));

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
  it("renders all five quick action cards", () => {
    render(<QuickActionsRow />);
    expect(screen.getByTestId("quick-action-threads")).toBeTruthy();
    expect(screen.getByTestId("quick-action-huddles")).toBeTruthy();
    expect(screen.getByTestId("quick-action-later")).toBeTruthy();
    expect(screen.getByTestId("quick-action-drafts")).toBeTruthy();
    expect(screen.getByTestId("quick-action-files")).toBeTruthy();
  });

  it("shows correct count units per card", () => {
    render(<QuickActionsRow />);
    expect(screen.getByText("0 new")).toBeTruthy();
    expect(screen.getByText("0 live")).toBeTruthy();
    expect(screen.getAllByText("0 items")).toHaveLength(3);
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

  it("navigates to drafts when Drafts is pressed", () => {
    render(<QuickActionsRow />);
    fireEvent.press(screen.getByTestId("quick-action-drafts"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/drafts");
  });

  it("navigates to files when Files is pressed", () => {
    render(<QuickActionsRow />);
    fireEvent.press(screen.getByTestId("quick-action-files"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/files");
  });

  it("shows draft count from storage", async () => {
    const { getAllDraftKeys } = require("@/lib/draft-storage");
    (getAllDraftKeys as jest.Mock).mockResolvedValueOnce(["ch-1", "ch-2"]);

    render(<QuickActionsRow />);

    const { waitFor } = require("@testing-library/react-native");
    await waitFor(() => {
      expect(screen.getByText("2 items")).toBeTruthy();
    });
  });
});
