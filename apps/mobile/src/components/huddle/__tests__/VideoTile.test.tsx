import React from "react";
import { render, screen } from "@testing-library/react-native";
import { asUserId } from "@openslaq/shared";

jest.mock("@livekit/react-native", () => ({
  VideoTrack: (props: Record<string, unknown>) => {
    const { View } = require("react-native");
    return <View testID="video-track" {...props} />;
  },
}));

import { VideoTile } from "../VideoTile";

const baseProps = {
  userId: asUserId("u-1"),
  displayName: "Alice",
  isMuted: false,
  isLocal: false,
  videoTrackRef: undefined,
};

describe("VideoTile", () => {
  it("renders with testID containing userId", () => {
    render(<VideoTile {...baseProps} />);
    expect(screen.getByTestId("video-tile-u-1")).toBeTruthy();
  });

  it("shows avatar fallback when videoTrackRef is undefined", () => {
    render(<VideoTile {...baseProps} />);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.queryByTestId("video-track")).toBeNull();
  });

  it("shows VideoTrack when videoTrackRef is provided", () => {
    const trackRef = { participant: {}, publication: {}, source: "camera" };
    render(<VideoTile {...baseProps} videoTrackRef={trackRef as never} />);
    expect(screen.getByTestId("video-track")).toBeTruthy();
  });

  it('shows "(You)" suffix for local user', () => {
    render(<VideoTile {...baseProps} isLocal={true} />);
    expect(screen.getByText(/Alice \(You\)/)).toBeTruthy();
  });

  it('does not show "(You)" for remote user', () => {
    render(<VideoTile {...baseProps} isLocal={false} />);
    const nameText = screen.getByText("Alice");
    expect(nameText).toBeTruthy();
    expect(screen.queryByText(/\(You\)/)).toBeNull();
  });

  it("shows MicOff icon when muted and not screen share", () => {
    render(<VideoTile {...baseProps} isMuted={true} />);
    expect(screen.getByTestId("icon-MicOff")).toBeTruthy();
  });

  it("does not show MicOff when not muted", () => {
    render(<VideoTile {...baseProps} isMuted={false} />);
    expect(screen.queryByTestId("icon-MicOff")).toBeNull();
  });

  it("shows ScreenShare icon when isScreenShare is true", () => {
    render(<VideoTile {...baseProps} isScreenShare={true} />);
    expect(screen.getByTestId("icon-ScreenShare")).toBeTruthy();
  });

  it("hides MicOff when muted AND screen share (screen share takes priority)", () => {
    render(<VideoTile {...baseProps} isMuted={true} isScreenShare={true} />);
    expect(screen.queryByTestId("icon-MicOff")).toBeNull();
    expect(screen.getByTestId("icon-ScreenShare")).toBeTruthy();
  });

  it("produces deterministic gradient for same name", () => {
    const { toJSON: json1 } = render(<VideoTile {...baseProps} displayName="TestUser" />);
    const { toJSON: json2 } = render(<VideoTile {...baseProps} displayName="TestUser" />);
    // Same display name should produce same rendered output
    expect(JSON.stringify(json1())).toBe(JSON.stringify(json2()));
  });
});
