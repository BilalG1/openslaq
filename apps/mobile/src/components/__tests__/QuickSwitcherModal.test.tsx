import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        borderDefault: "#ddd",
      },
      brand: { primary: "#4A154B", success: "#22c55e" },
      interaction: { badgeUnreadBg: "#f00", badgeUnreadText: "#fff" },
    },
  }),
}));

const makeChannel = (id: string, name: string, type = "public") => ({
  id,
  name,
  type,
  workspaceId: "ws-1",
  createdAt: "",
  createdBy: "u1",
  topic: null,
  description: null,
  displayName: null,
});

const makeDm = (channelId: string, userId: string, displayName: string) => ({
  channel: { id: channelId, name: "dm", type: "dm" as const, workspaceId: "ws-1", createdAt: "", createdBy: "u1", topic: null, description: null, displayName: null },
  otherUser: { id: userId, displayName, avatarUrl: null },
});

const makeGroupDm = (channelId: string, memberNames: string[]) => ({
  channel: { id: channelId, name: "group-dm", type: "group_dm" as const, workspaceId: "ws-1", createdAt: "", createdBy: "u1", topic: null, description: null, displayName: null },
  members: memberNames.map((name, i) => ({ id: `gm-${i}`, displayName: name, avatarUrl: null })),
});

let mockState: Record<string, unknown>;

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState }),
}));

import { QuickSwitcherModal } from "../QuickSwitcherModal";

beforeEach(() => {
  mockPush.mockClear();
  mockState = {
    channels: [makeChannel("ch-1", "general"), makeChannel("ch-2", "random")],
    dms: [makeDm("dm-1", "u-2", "Alice")],
    groupDms: [makeGroupDm("gdm-1", ["Bob", "Carol"])],
    unreadCounts: {},
    starredChannelIds: [],
    presence: {},
  };
});

it("renders channels, DMs, and group DMs", () => {
  const { getByTestId } = render(
    <QuickSwitcherModal visible onClose={jest.fn()} />,
  );

  expect(getByTestId("quick-switcher-item-ch-1")).toBeTruthy();
  expect(getByTestId("quick-switcher-item-ch-2")).toBeTruthy();
  expect(getByTestId("quick-switcher-item-dm-1")).toBeTruthy();
  expect(getByTestId("quick-switcher-item-gdm-1")).toBeTruthy();
});

it("filters results as user types", () => {
  const { getByTestId, queryByTestId } = render(
    <QuickSwitcherModal visible onClose={jest.fn()} />,
  );

  fireEvent.changeText(getByTestId("quick-switcher-input"), "gen");

  expect(getByTestId("quick-switcher-item-ch-1")).toBeTruthy();
  expect(queryByTestId("quick-switcher-item-ch-2")).toBeNull();
  expect(queryByTestId("quick-switcher-item-dm-1")).toBeNull();
});

it("navigates to channel on press", () => {
  const onClose = jest.fn();
  const { getByTestId } = render(
    <QuickSwitcherModal visible onClose={onClose} />,
  );

  fireEvent.press(getByTestId("quick-switcher-item-ch-1"));

  expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(channels)/ch-1");
  expect(onClose).toHaveBeenCalled();
});

it("navigates to DM on press", () => {
  const onClose = jest.fn();
  const { getByTestId } = render(
    <QuickSwitcherModal visible onClose={onClose} />,
  );

  fireEvent.press(getByTestId("quick-switcher-item-dm-1"));

  expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/dm/dm-1");
  expect(onClose).toHaveBeenCalled();
});

it("navigates to group DM on press", () => {
  const onClose = jest.fn();
  const { getByTestId } = render(
    <QuickSwitcherModal visible onClose={onClose} />,
  );

  fireEvent.press(getByTestId("quick-switcher-item-gdm-1"));

  expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/dm/gdm-1");
  expect(onClose).toHaveBeenCalled();
});

it("closes on backdrop press", () => {
  const onClose = jest.fn();
  const { getByTestId } = render(
    <QuickSwitcherModal visible onClose={onClose} />,
  );

  fireEvent.press(getByTestId("quick-switcher-backdrop"));

  expect(onClose).toHaveBeenCalled();
});

it("shows unread items first when no filter", () => {
  mockState = {
    ...mockState,
    unreadCounts: { "ch-2": 3 },
  };

  const { getAllByTestId } = render(
    <QuickSwitcherModal visible onClose={jest.fn()} />,
  );

  const items = getAllByTestId(/^quick-switcher-item-/);
  // ch-2 (random, has unreads) should be first
  expect(items[0].props.testID).toBe("quick-switcher-item-ch-2");
});

it("shows starred items before non-starred when no unreads", () => {
  mockState = {
    ...mockState,
    starredChannelIds: ["ch-2"],
  };

  const { getAllByTestId } = render(
    <QuickSwitcherModal visible onClose={jest.fn()} />,
  );

  const items = getAllByTestId(/^quick-switcher-item-/);
  // ch-2 (random, starred) should be before ch-1 (general, not starred)
  expect(items[0].props.testID).toBe("quick-switcher-item-ch-2");
});

it("shows online indicator for online DMs", () => {
  mockState = {
    ...mockState,
    presence: { "u-2": { online: true } },
  };

  const { getByTestId } = render(
    <QuickSwitcherModal visible onClose={jest.fn()} />,
  );

  expect(getByTestId("online-dot-dm-1")).toBeTruthy();
});
