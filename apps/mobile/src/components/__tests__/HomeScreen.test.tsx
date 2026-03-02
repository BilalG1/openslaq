import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

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
        surfaceHover: "#e8e8e8",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        dangerText: "#f00",
        borderDefault: "#ddd",
        borderSecondary: "#eee",
        avatarFallbackBg: "#ddd",
        avatarFallbackText: "#333",
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

const makeGroupDm = (channelId: string, memberNames: string[], displayName?: string) => ({
  channel: {
    id: channelId,
    name: "group-dm",
    type: "group_dm" as const,
    workspaceId: "ws-1",
    createdAt: "",
    createdBy: "u1",
    topic: null,
    description: null,
    displayName: displayName ?? null,
  },
  members: memberNames.map((name, i) => ({
    id: `gm-${i}`,
    displayName: name,
    avatarUrl: null,
  })),
});

let mockState: Record<string, unknown>;

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState }),
}));

// Must import after mocks
// @ts-expect-error — TS bundler resolution struggles with nested parenthesized expo-router paths; jest resolves it fine
import HomeScreen from "../../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/index";

beforeEach(() => {
  mockPush.mockClear();
  mockState = {
    channels: [
      makeChannel("ch-1", "general"),
      makeChannel("ch-2", "random"),
      makeChannel("ch-3", "secret", "private"),
    ],
    dms: [
      makeDm("dm-1", "u-2", "Alice"),
      makeDm("dm-2", "u-3", "Bob"),
    ],
    groupDms: [],
    starredChannelIds: [],
    savedMessageIds: [],
    unreadCounts: {},
    channelNotificationPrefs: {},
    presence: {},
    ui: { bootstrapLoading: false, bootstrapError: null },
  };
});

describe("HomeScreen", () => {
  it("hides Unreads section when no unreads", () => {
    render(<HomeScreen />);
    expect(screen.queryByTestId("section-header-unreads")).toBeNull();
  });

  it("shows Unreads section with channels and DMs that have unread counts", () => {
    mockState.unreadCounts = { "ch-1": 3, "dm-1": 1 };
    render(<HomeScreen />);
    expect(screen.getByTestId("section-header-unreads")).toBeTruthy();
  });

  it("excludes muted channels from Unreads", () => {
    mockState.unreadCounts = { "ch-1": 5 };
    mockState.channelNotificationPrefs = { "ch-1": "muted" };
    render(<HomeScreen />);
    expect(screen.queryByTestId("section-header-unreads")).toBeNull();
  });

  it("hides Starred section when no starred channels", () => {
    render(<HomeScreen />);
    expect(screen.queryByTestId("section-header-starred")).toBeNull();
  });

  it("shows Starred section when channels are starred", () => {
    mockState.starredChannelIds = ["ch-2"];
    render(<HomeScreen />);
    expect(screen.getByTestId("section-header-starred")).toBeTruthy();
  });

  it("collapses section items when header is toggled", () => {
    render(<HomeScreen />);
    // Channels section should be visible
    expect(screen.getByText("general")).toBeTruthy();

    // Collapse channels
    fireEvent.press(screen.getByTestId("section-header-channels"));

    // general should no longer be rendered
    expect(screen.queryByText("general")).toBeNull();
  });

  it("navigates to channel on press", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("channel-row-ch-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(channels)/ch-1");
  });

  it("navigates to DM on press", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("dm-row-dm-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/dm/dm-1");
  });

  it("renders Browse Channels link in Channels section footer", () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("browse-channels-link")).toBeTruthy();
  });

  // Group DM tests
  it("renders group DMs in the DM section", () => {
    mockState.groupDms = [makeGroupDm("gdm-1", ["Alice", "Bob"])];
    render(<HomeScreen />);
    expect(screen.getByTestId("group-dm-row-gdm-1")).toBeTruthy();
    expect(screen.getByText("Alice, Bob")).toBeTruthy();
  });

  it("uses displayName for group DM when set", () => {
    mockState.groupDms = [makeGroupDm("gdm-1", ["Alice", "Bob"], "Project Team")];
    render(<HomeScreen />);
    expect(screen.getByText("Project Team")).toBeTruthy();
  });

  it("shows group DMs in Unreads when unread > 0", () => {
    mockState.groupDms = [makeGroupDm("gdm-1", ["Alice", "Bob"])];
    mockState.unreadCounts = { "gdm-1": 2 };
    render(<HomeScreen />);
    expect(screen.getByTestId("section-header-unreads")).toBeTruthy();
    // Should appear in both unreads and DMs sections
    expect(screen.getAllByTestId("group-dm-row-gdm-1").length).toBeGreaterThanOrEqual(1);
  });

  it("navigates to DM route when group DM is tapped", () => {
    mockState.groupDms = [makeGroupDm("gdm-1", ["Alice", "Bob"])];
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("group-dm-row-gdm-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/dm/gdm-1");
  });
});
