import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { HuddleControls } from "../huddle/HuddleControls";

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
      brand: { primary: "#4A154B", danger: "#E01E5A" },
    },
  }),
}));

const defaultProps = {
  isMuted: false,
  isCameraOn: false,
  isScreenSharing: false,
  onToggleMute: jest.fn(),
  onToggleCamera: jest.fn(),
  onToggleScreenShare: jest.fn(),
  onLeave: jest.fn(),
};

describe("HuddleControls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all control buttons", () => {
    render(<HuddleControls {...defaultProps} />);

    expect(screen.getByTestId("huddle-control-mute")).toBeTruthy();
    expect(screen.getByTestId("huddle-control-camera")).toBeTruthy();
    expect(screen.getByTestId("huddle-control-screen-share")).toBeTruthy();
    expect(screen.getByTestId("huddle-control-leave")).toBeTruthy();
  });

  it("calls onToggleScreenShare when screen share button is pressed", () => {
    render(<HuddleControls {...defaultProps} />);

    fireEvent.press(screen.getByTestId("huddle-control-screen-share"));
    expect(defaultProps.onToggleScreenShare).toHaveBeenCalledTimes(1);
  });

  it("shows 'Stop' label when screen sharing is active", () => {
    render(<HuddleControls {...defaultProps} isScreenSharing />);

    expect(screen.getByText("Stop")).toBeTruthy();
  });

  it("shows 'Share' label when not screen sharing", () => {
    render(<HuddleControls {...defaultProps} />);

    expect(screen.getByText("Share")).toBeTruthy();
  });

  it("calls onToggleMute when mute button is pressed", () => {
    render(<HuddleControls {...defaultProps} />);

    fireEvent.press(screen.getByTestId("huddle-control-mute"));
    expect(defaultProps.onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("calls onLeave when leave button is pressed", () => {
    render(<HuddleControls {...defaultProps} />);

    fireEvent.press(screen.getByTestId("huddle-control-leave"));
    expect(defaultProps.onLeave).toHaveBeenCalledTimes(1);
  });
});
