import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: { selection: jest.fn(), heavy: jest.fn() },
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceTertiary: "#eee",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

import { DmActionSheet } from "../DmActionSheet";

describe("DmActionSheet", () => {
  const defaultProps = {
    visible: true,
    channelId: "dm-1",
    displayName: "Alice",
    isStarred: false,
    onStar: jest.fn(),
    onUnstar: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders display name", () => {
    render(<DmActionSheet {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("returns null when channelId is null", () => {
    const { toJSON } = render(<DmActionSheet {...defaultProps} channelId={null} />);
    expect(toJSON()).toBeNull();
  });

  it("shows Star when not starred", () => {
    render(<DmActionSheet {...defaultProps} />);
    expect(screen.getByTestId("action-star-dm")).toBeTruthy();
  });

  it("shows Unstar when starred", () => {
    render(<DmActionSheet {...defaultProps} isStarred />);
    expect(screen.getByTestId("action-unstar-dm")).toBeTruthy();
  });

  it("calls onStar when Star is pressed", () => {
    render(<DmActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("action-star-dm"));
    expect(defaultProps.onStar).toHaveBeenCalledWith("dm-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onUnstar when Unstar is pressed", () => {
    render(<DmActionSheet {...defaultProps} isStarred />);
    fireEvent.press(screen.getByTestId("action-unstar-dm"));
    expect(defaultProps.onUnstar).toHaveBeenCalledWith("dm-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("closes when backdrop is pressed", () => {
    render(<DmActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("dm-action-sheet-content-backdrop"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
