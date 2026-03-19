import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

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
      brand: { primary: "#1264a3", danger: "#dc2626" },
    },
  }),
}));

import { ChannelActionSheet } from "../ChannelActionSheet";
import type { Channel, ChannelId, UserId, WorkspaceId } from "@openslaq/shared";

const makeChannel = (id: string, name: string): Channel => ({
  id: id as unknown as ChannelId,
  name,
  type: "public",
  workspaceId: "ws-1" as unknown as WorkspaceId,
  createdAt: "",
  createdBy: "u1" as unknown as UserId,
  description: null,
  displayName: null,
  isArchived: false,
});

describe("ChannelActionSheet", () => {
  const defaultProps = {
    visible: true,
    channel: makeChannel("ch-1", "general"),
    isStarred: false,
    isMuted: false,
    notifyLevel: "all" as const,
    isAdmin: false,
    onStar: jest.fn(),
    onUnstar: jest.fn(),
    onSetNotificationPref: jest.fn(),
    onArchive: jest.fn(),
    onChannelInfo: jest.fn(),
    onLeaveChannel: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders channel name", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    expect(screen.getByText("# general")).toBeTruthy();
  });

  it("returns null when channel is null", () => {
    const { toJSON } = render(<ChannelActionSheet {...defaultProps} channel={null} />);
    expect(toJSON()).toBeNull();
  });

  it("shows Star Channel when not starred", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    expect(screen.getByTestId("action-star-channel")).toBeTruthy();
    expect(screen.getByText("Star Channel")).toBeTruthy();
  });

  it("shows Unstar Channel when starred", () => {
    render(<ChannelActionSheet {...defaultProps} isStarred />);
    expect(screen.getByTestId("action-unstar-channel")).toBeTruthy();
    expect(screen.getByText("Unstar Channel")).toBeTruthy();
  });

  it("calls onStar when Star Channel is pressed", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("action-star-channel"));
    expect(defaultProps.onStar).toHaveBeenCalledWith("ch-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onUnstar when Unstar Channel is pressed", () => {
    render(<ChannelActionSheet {...defaultProps} isStarred />);
    fireEvent.press(screen.getByTestId("action-unstar-channel"));
    expect(defaultProps.onUnstar).toHaveBeenCalledWith("ch-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows notification preference with current level", () => {
    render(<ChannelActionSheet {...defaultProps} notifyLevel="mentions" />);
    expect(screen.getByText("Notifications: Mentions only")).toBeTruthy();
  });

  it("opens notification pref alert on press", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<ChannelActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("action-notification-pref"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Notification Preference",
      expect.stringContaining("All messages"),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("does not show archive for non-admin", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    expect(screen.queryByTestId("action-archive-channel")).toBeNull();
  });

  it("shows archive for admin", () => {
    render(<ChannelActionSheet {...defaultProps} isAdmin />);
    expect(screen.getByTestId("action-archive-channel")).toBeTruthy();
  });

  it("shows confirmation before archiving", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<ChannelActionSheet {...defaultProps} isAdmin />);
    fireEvent.press(screen.getByTestId("action-archive-channel"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Archive Channel",
      expect.stringContaining("general"),
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Archive", style: "destructive" }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it("shows Channel Info action", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    expect(screen.getByTestId("action-channel-info")).toBeTruthy();
    expect(screen.getByText("Channel Info")).toBeTruthy();
  });

  it("calls onChannelInfo when Channel Info is pressed", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("action-channel-info"));
    expect(defaultProps.onChannelInfo).toHaveBeenCalledWith("ch-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows Leave Channel action", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    expect(screen.getByTestId("action-leave-channel")).toBeTruthy();
    expect(screen.getByText("Leave Channel")).toBeTruthy();
  });

  it("shows confirmation before leaving channel", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<ChannelActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("action-leave-channel"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Leave Channel",
      expect.stringContaining("general"),
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Leave", style: "destructive" }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it("closes when backdrop is pressed", () => {
    render(<ChannelActionSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId("channel-action-sheet-content-backdrop"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
