import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

jest.mock("@/theme/constants", () => ({
  GREEN: "#22c55e",
  WHITE: "#fff",
  WHITE_OVERLAY_15: "rgba(255,255,255,0.15)",
}));

jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  return {
    Mic: (props: Record<string, unknown>) => <View testID="icon-mic" {...props} />,
    MicOff: (props: Record<string, unknown>) => <View testID="icon-mic-off" {...props} />,
    Video: (props: Record<string, unknown>) => <View testID="icon-video" {...props} />,
    VideoOff: (props: Record<string, unknown>) => <View testID="icon-video-off" {...props} />,
    ScreenShare: (props: Record<string, unknown>) => <View testID="icon-screen-share" {...props} />,
    PhoneOff: (props: Record<string, unknown>) => <View testID="icon-phone-off" {...props} />,
  };
});

import { HuddleControls } from "../HuddleControls";

const baseProps = {
  isMuted: false,
  isCameraOn: false,
  isScreenSharing: false,
  onToggleMute: jest.fn(),
  onToggleCamera: jest.fn(),
  onToggleScreenShare: jest.fn(),
  onLeave: jest.fn(),
};

describe("HuddleControls", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders all control buttons", () => {
    render(<HuddleControls {...baseProps} />);
    expect(screen.getByTestId("huddle-control-mute")).toBeTruthy();
    expect(screen.getByTestId("huddle-control-camera")).toBeTruthy();
    expect(screen.getByTestId("huddle-control-leave")).toBeTruthy();
  });

  it("leave button is same size as other buttons (56px)", () => {
    render(<HuddleControls {...baseProps} />);
    const leaveButton = screen.getByTestId("huddle-control-leave");
    const muteButton = screen.getByTestId("huddle-control-mute");
    const leaveStyles = Array.isArray(leaveButton.props.style)
      ? Object.assign({}, ...leaveButton.props.style)
      : leaveButton.props.style;
    const muteStyles = Array.isArray(muteButton.props.style)
      ? Object.assign({}, ...muteButton.props.style)
      : muteButton.props.style;
    expect(leaveStyles.width).toBe(muteStyles.width);
    expect(leaveStyles.height).toBe(muteStyles.height);
  });

  it("calls onLeave when leave button is pressed", () => {
    render(<HuddleControls {...baseProps} />);
    fireEvent.press(screen.getByTestId("huddle-control-leave"));
    expect(baseProps.onLeave).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleMute when mute button is pressed", () => {
    render(<HuddleControls {...baseProps} />);
    fireEvent.press(screen.getByTestId("huddle-control-mute"));
    expect(baseProps.onToggleMute).toHaveBeenCalledTimes(1);
  });
});
