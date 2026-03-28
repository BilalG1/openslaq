import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { Channel, ChannelId, UserId, WorkspaceId, ChannelNotifyLevel } from "@openslaq/shared";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#eee",
        surfaceHover: "#e5e5e5",
        surfaceSelected: "#dbeafe",
        textPrimary: "#000",
        textSecondary: "#666",
        textMuted: "#888",
        textFaint: "#999",
        borderDefault: "#ddd",
      },
      brand: { primary: "#1264a3", danger: "#dc2626" },
    },
  }),
}));

jest.mock("@/components/ui/BottomSheet", () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));

import { ChannelInfoPanel } from "../ChannelInfoPanel.variant-a";

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: "ch-1" as unknown as ChannelId,
    name: "general",
    displayName: null,
    type: "public",
    workspaceId: "ws-1" as unknown as WorkspaceId,
    createdAt: "2026-01-15T12:00:00Z",
    createdBy: "u1" as unknown as UserId,
    description: null,
    topic: null,
    memberCount: 42,
    ...overrides,
  } as Channel;
}

const defaultCallbacks = {
  onToggleStar: jest.fn(),
  onNotificationPress: jest.fn(),
  onViewMembers: jest.fn(),
  onViewPinned: jest.fn(),
  onViewFiles: jest.fn(),
  onEditTopic: jest.fn(),
  onLeaveChannel: jest.fn(),
  onClose: jest.fn(),
};

function renderPanel(overrides: Record<string, unknown> = {}) {
  const props = {
    visible: true,
    channel: makeChannel(),
    isStarred: false,
    notificationLevel: "all" as ChannelNotifyLevel,
    pinCount: 3,
    ...defaultCallbacks,
    ...overrides,
  };
  return render(<ChannelInfoPanel {...props} />);
}

describe("ChannelInfoPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when channel is undefined", () => {
    const { toJSON } = renderPanel({ channel: undefined });
    expect(toJSON()).toBeNull();
  });

  it("renders channel name", () => {
    renderPanel();
    expect(screen.getByText("general")).toBeTruthy();
  });

  it("uses displayName over name when present", () => {
    renderPanel({ channel: makeChannel({ displayName: "General Chat" }) });
    expect(screen.getByText("General Chat")).toBeTruthy();
  });

  it("renders description when present", () => {
    renderPanel({ channel: makeChannel({ description: "A place for general discussion" }) });
    expect(screen.getByText("A place for general discussion")).toBeTruthy();
  });

  it("does not render description when null", () => {
    renderPanel();
    expect(screen.queryByText("A place for general discussion")).toBeNull();
  });

  it("shows member count in stats row", () => {
    renderPanel();
    expect(screen.getAllByText("42").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Members").length).toBeGreaterThanOrEqual(1);
  });

  it("shows pin count in stats row", () => {
    renderPanel({ pinCount: 7 });
    expect(screen.getAllByText("7").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pinned")).toBeTruthy();
  });

  it('shows "Star" label when not starred', () => {
    renderPanel({ isStarred: false });
    expect(screen.getAllByText("Star").length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Starred" label when starred', () => {
    renderPanel({ isStarred: true });
    expect(screen.getByText("Starred")).toBeTruthy();
  });

  it('shows "Notifications" label when level is all', () => {
    renderPanel({ notificationLevel: "all" });
    expect(screen.getByText("Notifications")).toBeTruthy();
  });

  it('shows "Muted" label when level is muted', () => {
    renderPanel({ notificationLevel: "muted" });
    expect(screen.getByText("Muted")).toBeTruthy();
  });

  it('shows "Mentions" label when level is mentions', () => {
    renderPanel({ notificationLevel: "mentions" });
    expect(screen.getByText("Mentions")).toBeTruthy();
  });

  it("renders Members, Pinned Messages, and Files nav rows", () => {
    renderPanel();
    expect(screen.getAllByText("Members")).toHaveLength(2); // stats + nav row
    expect(screen.getByText("Pinned Messages")).toBeTruthy();
    expect(screen.getByText("Files")).toBeTruthy();
  });

  it("renders created date", () => {
    renderPanel();
    expect(screen.getByText(/Created on/)).toBeTruthy();
    expect(screen.getByText(/January 15, 2026/)).toBeTruthy();
  });

  it("renders Leave Channel button", () => {
    renderPanel();
    expect(screen.getByText("Leave Channel")).toBeTruthy();
  });

  it("calls onToggleStar when Star is pressed", () => {
    renderPanel();
    fireEvent.press(screen.getByLabelText("Star"));
    expect(defaultCallbacks.onToggleStar).toHaveBeenCalled();
  });

  it("calls onViewMembers when Members nav row is pressed", () => {
    renderPanel();
    fireEvent.press(screen.getByLabelText("Members"));
    expect(defaultCallbacks.onViewMembers).toHaveBeenCalled();
  });

  it("calls onLeaveChannel when Leave Channel is pressed", () => {
    renderPanel();
    fireEvent.press(screen.getByLabelText("Leave channel"));
    expect(defaultCallbacks.onLeaveChannel).toHaveBeenCalled();
  });

  it("does not render a redundant drag handle inside panel content", () => {
    const { toJSON } = renderPanel();
    const json = JSON.stringify(toJSON());
    // The channel icon circle (64px) should be the first visual element, not a drag handle
    // If there were a drag handle, we'd see a 40px wide + 4px tall element before the icon
    expect(json).not.toContain('"width":40,"height":4');
  });
});
