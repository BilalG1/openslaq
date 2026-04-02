const mockToggle = jest.fn();
jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({ toggle: mockToggle }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@/contexts/WorkspaceBootstrapProvider", () => ({
  useWorkspaceSlug: () => "acme",
}));

jest.mock("@/lib/draft-storage", () => ({
  getAllDraftKeys: jest.fn(() => Promise.resolve([])),
}));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Svg: (props: Record<string, unknown>) => <View {...props} />,
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
        textFaint: "#999",
        textMuted: "#888",
        dangerText: "#f00",
        borderDefault: "#ddd",
        borderSecondary: "#eee",
        avatarFallbackBg: "#ddd",
        avatarFallbackText: "#333",
        headerBg: "#111827",
        headerText: "#FFFFFF",
        headerSearchBg: "rgba(255,255,255,0.2)",
      },
      brand: { primary: "#1264a3", success: "#22c55e" },
      interaction: { badgeUnreadBg: "#f00", badgeUnreadText: "#fff" },
    },
  }),
}));

jest.mock("@/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: () => ({ profile: { displayName: "Test User", avatarUrl: null }, loading: false }),
}));

const mockOpenCreateChannel = jest.fn();
const mockOpenNewDm = jest.fn();

jest.mock("@/contexts/HomeActionsContext", () => ({
  useHomeActions: () => ({
    openCreateChannel: mockOpenCreateChannel,
    openNewDm: mockOpenNewDm,
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

const makeDm = (channelId: string, userId: string, displayName: string, avatarUrl: string | null = null) => ({
  channel: { id: channelId, name: "dm", type: "dm" as const, workspaceId: "ws-1", createdAt: "", createdBy: "u1", topic: null, description: null, displayName: null },
  otherUser: { id: userId, displayName, avatarUrl },
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

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ authProvider: { getToken: jest.fn() } }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

jest.mock("@/utils/haptics", () => ({
  haptics: { selection: jest.fn(), heavy: jest.fn(), light: jest.fn() },
}));

jest.mock("@openslaq/client-core", () => ({
  starChannelOp: jest.fn(),
  unstarChannelOp: jest.fn(),
  setChannelNotificationPrefOp: jest.fn(),
  leaveChannel: jest.fn(),
}));

let mockState: Record<string, unknown>;
const mockDispatch = jest.fn();

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState, dispatch: mockDispatch }),
}));

// Must import after mocks
// @ts-expect-error — TS bundler resolution struggles with nested parenthesized expo-router paths; jest resolves it fine
import HomeScreen from "../../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/index";

beforeEach(() => {
  mockPush.mockClear();
  mockOpenCreateChannel.mockClear();
  mockOpenNewDm.mockClear();
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
    activeHuddles: {},
    unreadCounts: {},
    channelNotificationPrefs: {},
    presence: {},
    workspaces: [{ slug: "acme", name: "Acme Co" }],
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
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/ch-1");
  });

  it("navigates to DM on press", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("dm-row-dm-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/dm/dm-1");
  });

  it("renders Add channel link in Channels section footer", () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("add-channel-link")).toBeTruthy();
  });

  it("shows ActionSheet when Add channel is pressed", () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("add-channel-link"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Add Channel",
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: "Create a Channel" }),
        expect.objectContaining({ text: "Browse Channels" }),
        expect.objectContaining({ text: "Cancel" }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it("renders new DM link in DMs section footer", () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("new-dm-link")).toBeTruthy();
  });

  it("calls openNewDm when Start a new message is pressed", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("new-dm-link"));
    expect(mockOpenNewDm).toHaveBeenCalledTimes(1);
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

  it("shows huddle icon on channel row when huddle is active", () => {
    mockState.activeHuddles = {
      "ch-1": { channelId: "ch-1", participants: [{ userId: "u-1" }], startedAt: "", livekitRoom: null, screenShareUserId: null, messageId: null },
    };
    render(<HomeScreen />);
    expect(screen.getByTestId("huddle-icon-ch-1")).toBeTruthy();
  });

  it("does not show huddle icon when no active huddle", () => {
    render(<HomeScreen />);
    expect(screen.queryByTestId("huddle-icon-ch-1")).toBeNull();
  });

  describe("DM avatar images", () => {
    it("renders avatar image when otherUser has avatarUrl", () => {
      mockState.dms = [makeDm("dm-1", "u-2", "Alice", "https://cdn.test/alice.png")];
      render(<HomeScreen />);
      const avatarImage = screen.getByTestId("dm-avatar-image-dm-1");
      expect(avatarImage.props.source).toEqual({ uri: "https://cdn.test/alice.png" });
    });

    it("renders initials fallback when otherUser has no avatarUrl", () => {
      mockState.dms = [makeDm("dm-1", "u-2", "Zara")];
      render(<HomeScreen />);
      expect(screen.queryByTestId("dm-avatar-image-dm-1")).toBeNull();
      expect(screen.getByText("Z")).toBeTruthy();
    });
  });

  describe("Group DM avatar images", () => {
    it("renders first member avatar image when member has avatarUrl", () => {
      mockState.groupDms = [{
        ...makeGroupDm("gdm-1", ["Alice", "Bob"]),
        members: [
          { id: "gm-0", displayName: "Alice", avatarUrl: "https://cdn.test/alice.png" },
          { id: "gm-1", displayName: "Bob", avatarUrl: "https://cdn.test/bob.png" },
        ],
      }];
      render(<HomeScreen />);
      const avatarImage = screen.getByTestId("group-dm-avatar-image-gdm-1");
      expect(avatarImage).toBeTruthy();
    });

    it("renders fallback icon when no members have avatarUrl", () => {
      mockState.groupDms = [makeGroupDm("gdm-1", ["Alice", "Bob"])];
      render(<HomeScreen />);
      expect(screen.queryByTestId("group-dm-avatar-image-gdm-1")).toBeNull();
    });
  });

  it("renders search pill in header", () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("search-pill")).toBeTruthy();
  });

  it("renders quick actions row", () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("quick-action-threads")).toBeTruthy();
    expect(screen.getByTestId("quick-action-later")).toBeTruthy();
  });

  it("opens DM action sheet on DM long press", () => {
    render(<HomeScreen />);
    fireEvent(screen.getByTestId("dm-row-dm-1"), "longPress");
    expect(screen.getByTestId("dm-action-sheet-content")).toBeTruthy();
  });

  it("opens DM action sheet on group DM long press", () => {
    mockState.groupDms = [makeGroupDm("gdm-1", ["Alice", "Bob"])];
    render(<HomeScreen />);
    fireEvent(screen.getByTestId("group-dm-row-gdm-1"), "longPress");
    expect(screen.getByTestId("dm-action-sheet-content")).toBeTruthy();
  });

  it("shows starred DMs in the Starred section", () => {
    mockState.starredChannelIds = ["dm-1"];
    render(<HomeScreen />);
    expect(screen.getByTestId("section-header-starred")).toBeTruthy();
  });
});
