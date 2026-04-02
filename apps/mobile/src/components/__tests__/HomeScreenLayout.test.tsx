const mockToggle = jest.fn();
jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({ toggle: mockToggle }),
}));

import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";

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
        surfaceTertiary: "#e0e0e0",
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

jest.mock("@/contexts/HomeActionsContext", () => ({
  useHomeActions: () => ({
    openCreateChannel: jest.fn(),
    openNewDm: jest.fn(),
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ authProvider: { getToken: jest.fn() } }),
}));

jest.mock("@/lib/api", () => ({ api: {} }));

jest.mock("@/utils/haptics", () => ({
  haptics: { selection: jest.fn(), heavy: jest.fn(), light: jest.fn() },
}));

jest.mock("@openslaq/client-core", () => ({
  starChannelOp: jest.fn(),
  unstarChannelOp: jest.fn(),
  setChannelNotificationPrefOp: jest.fn(),
  leaveChannel: jest.fn(),
}));

jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => ({ socket: null }),
}));

const makeChannel = (id: string, name: string, type = "public") => ({
  id, name, type,
  workspaceId: "ws-1", createdAt: "", createdBy: "u1",
  topic: null, description: null, displayName: null,
});

const makeDm = (channelId: string, userId: string, displayName: string) => ({
  channel: { id: channelId, name: "dm", type: "dm" as const, workspaceId: "ws-1", createdAt: "", createdBy: "u1", topic: null, description: null, displayName: null },
  otherUser: { id: userId, displayName, avatarUrl: null },
  lastMessageContent: null,
  lastMessageAt: null,
});

const makeGroupDm = (channelId: string, memberNames: string[]) => ({
  channel: { id: channelId, name: "group-dm", type: "group_dm" as const, workspaceId: "ws-1", createdAt: "", createdBy: "u1", topic: null, description: null, displayName: null },
  members: memberNames.map((name, i) => ({ id: `gm-${i}`, displayName: name, avatarUrl: null })),
});

let mockState: Record<string, unknown>;
const mockDispatch = jest.fn();

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState, dispatch: mockDispatch }),
}));

// @ts-expect-error — TS bundler resolution struggles with nested parenthesized expo-router paths
import HomeScreen from "../../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/index";

const SCREEN_W = 390;

describe("HomeScreen layout — starred section alignment", () => {
  beforeEach(() => {
    mockState = {
      channels: [makeChannel("ch-1", "general")],
      dms: [makeDm("dm-1", "u-2", "Alice")],
      groupDms: [makeGroupDm("gdm-1", ["Bob", "Carol"])],
      starredChannelIds: ["ch-1", "dm-1", "gdm-1"],
      savedMessageIds: [],
      activeHuddles: {},
      unreadCounts: {},
      channelNotificationPrefs: {},
      presence: {},
      workspaces: [{ slug: "acme", name: "Acme Co" }],
      ui: { bootstrapLoading: false, bootstrapError: null },
    };
  });

  // Helper: find first Text child inside a layout entry (by walking the tree)
  type Entry = { type: string; testID?: string; left: number; width: number; children: Entry[] };
  function firstText(entry: Entry): Entry | null {
    if (entry.type === "Text") return entry;
    for (const child of entry.children ?? []) {
      const found = firstText(child);
      if (found) return found;
    }
    return null;
  }

  // Helper: find a layout entry by testID in the tree (byTestID only has rects, not children)
  function findEntry(entry: Entry, testID: string): Entry | null {
    if (entry.testID === testID) return entry;
    for (const child of entry.children ?? []) {
      const found = findEntry(child, testID);
      if (found) return found;
    }
    return null;
  }

  // Find the channel name Text inside a row. The row's structure is:
  //   View (channelRow) > View (iconContainer) > ... , Text (channelName), ...
  // We want the second child of the channelRow View (the Text with flex:1).
  // But since icon/avatar may contain Text too, we skip the first child (icon/avatar container)
  // and find the first Text in the remaining children.
  function findNameText(rowEntry: Entry): Entry | null {
    // The row has a single View child (channelRow), then inside that: icon/avatar + name text
    const channelRow = rowEntry.children?.[0];
    if (!channelRow) return null;
    // Skip first child (icon/avatar), find first Text in the rest
    for (let i = 1; i < channelRow.children.length; i++) {
      const text = firstText(channelRow.children[i]!);
      if (text) return text;
    }
    return null;
  }

  it("channel name and DM name have the same left position in starred section", async () => {
    const { toJSON } = render(<HomeScreen />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 844 });

    const channelEntry = findEntry(layout.root as Entry, "channel-row-ch-1");
    const dmEntry = findEntry(layout.root as Entry, "dm-row-dm-1");

    expect(channelEntry).not.toBeNull();
    expect(dmEntry).not.toBeNull();

    const channelName = findNameText(channelEntry!);
    const dmName = findNameText(dmEntry!);

    expect(channelName).not.toBeNull();
    expect(dmName).not.toBeNull();

    expect(channelName!.left).toBe(dmName!.left);
  });

  it("channel name and group DM name have the same left position in starred section", async () => {
    const { toJSON } = render(<HomeScreen />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 844 });

    const channelEntry = findEntry(layout.root as Entry, "channel-row-ch-1");
    const groupDmEntry = findEntry(layout.root as Entry, "group-dm-row-gdm-1");

    expect(channelEntry).not.toBeNull();
    expect(groupDmEntry).not.toBeNull();

    const channelName = findNameText(channelEntry!);
    const groupDmName = findNameText(groupDmEntry!);

    expect(channelName).not.toBeNull();
    expect(groupDmName).not.toBeNull();

    expect(channelName!.left).toBe(groupDmName!.left);
  });
});
